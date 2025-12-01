# Ticket #064: Fly.io Backup Strategy & Data Protection Plan

**Status:** 📋 Planning
**Priority:** 🔴 Critical
**Date:** October 17, 2025
**User:** Lilah (First Production Client)

---

## Executive Summary

This document outlines a comprehensive data protection strategy for Lilah's My Jarvis instance on Fly.io. As our first production knowledge worker client, ensuring her data never disappears is absolutely critical. This ticket provides a complete understanding of Fly.io's storage system, automatic backup capabilities, limitations, and actionable recommendations for bulletproof data protection.

---

## Understanding Fly.io Persistent Storage

### What Are Fly Volumes?

**Fly Volumes** are Fly.io's persistent storage solution (equivalent to "disk" in Render):
- **Physical Architecture**: A slice of an NVMe drive on the same physical server as your container (called a "Machine")
- **Local Storage**: NOT network storage - lives on the same hardware as your app
- **One-to-One Mapping**: Each Machine can mount exactly one volume, and each volume can attach to exactly one Machine
- **Regional**: Each volume exists on one server in a single region

### Key Characteristics

1. **Performance**:
   - High-performance NVMe storage
   - Much faster than ephemeral container disks (which are limited to 2000 IOPS and 8MiB/s)

2. **Persistence**:
   - Data survives container restarts and redeployments
   - Mounted at `/workspace` in our configuration
   - All user files, Claude authentication, and workspace data stored here

3. **Encryption**:
   - Encrypted at rest by default
   - Keys stored in Fly.io's redundant secret storage systems
   - Zero configuration required

### Critical Limitation: No Automatic Replication

⚠️ **MOST IMPORTANT POINT**:

Fly.io **does NOT automatically replicate data** between volumes. This is fundamentally different from managed database services:

- If you have multiple volumes, they are completely independent
- Your application must handle synchronization if you want redundancy
- A single volume failure = potential data loss without external backups

**From Fly.io Documentation**:
> "Volumes are independent of one another; Fly.io does not automatically replicate data among the volumes on an app. If you need the volumes to sync up, then your app has to make that happen."

---

## Fly.io's Built-in Backup System

### Automatic Daily Snapshots

Fly.io automatically takes daily block-level snapshots of all volumes:

**Default Configuration**:
- **Frequency**: Once per day
- **Retention**: 5 days (default)
- **Configurable**: 1 to 60 days retention

**How to Configure**:
```toml
# In fly.toml
[mounts]
  source = "workspace"
  destination = "/workspace"
  snapshot_retention = 60  # Keep snapshots for 60 days
```

### Manual On-Demand Snapshots

You can create snapshots anytime:

```bash
# List volumes
fly volumes list --app my-jarvis-lilah

# Create snapshot
fly volumes snapshots create <volume-id> --app my-jarvis-lilah

# List snapshots for a volume
fly volumes snapshots list <volume-id> --app my-jarvis-lilah
```

### Restoring from Snapshots

```bash
# 1. List snapshots
fly volumes snapshots list <volume-id>

# 2. Create new volume from snapshot
fly volumes create workspace \
  --snapshot-id <snapshot-id> \
  --region sjc \
  --app my-jarvis-lilah

# 3. Update app to use new volume
# (Requires machine restart with new volume)
```

### Critical Warning About Snapshots

⚠️ **From Fly.io Documentation**:

> "Daily automatic snapshots may not have your latest data, and you should still implement your own backup plan for important data."

> "If the data stored on your volume updates frequently, then you should have other methods to back up or replicate your data in addition to daily snapshots, as the snapshots shouldn't be your primary backup method."

**Why Snapshots Aren't Enough**:
- Taken once per day (could lose up to 24 hours of work)
- If host fails between snapshots, data created since last snapshot is **permanently lost**
- Snapshots are stored on Fly.io's infrastructure (not independent backup)
- Limited retention (max 60 days)

---

## Disaster Scenarios & Risk Analysis

### Scenario 1: Host Hardware Failure

**What Happens**:
- Physical server hosting the volume fails
- Volume becomes inaccessible
- Data may be permanently lost if drive is damaged

**Impact**: 🔴 Critical
- App goes offline
- Data loss: Up to 24 hours since last snapshot
- If drive physically damaged: Total data loss

**Current Protection**: Automatic snapshots only

**Risk Level**: HIGH if only single volume

### Scenario 2: Accidental File Deletion

**What Happens**:
- User deletes files accidentally
- Application bug deletes data
- No recycle bin or undo

**Impact**: 🟡 Medium
- Specific files lost
- Can restore from snapshot if recent enough

**Current Protection**: Snapshots + can SSH to verify before disaster

**Risk Level**: MEDIUM

### Scenario 3: Volume Corruption

**What Happens**:
- NVMe drive corruption (rare but possible)
- File system errors
- Silent data corruption

**Impact**: 🔴 Critical
- Unpredictable data loss
- May not be detected until too late

**Current Protection**: Snapshots only

**Risk Level**: MEDIUM (rare but catastrophic)

### Scenario 4: Deployment Mistakes

**What Happens**:
- Code bug wipes workspace (like we saw with init-workspace.sh)
- Deployment script deletes files
- Configuration error

**Impact**: 🔴 Critical
- Could wipe entire workspace
- Snapshots won't help if deletion happens after deployment

**Current Protection**: Code review + testing

**Risk Level**: MEDIUM (preventable)

### Scenario 5: Fly.io Infrastructure Issue

**What Happens**:
- Regional outage
- Data center disaster
- Account suspension/billing issue

**Impact**: 🔴 Critical
- Complete loss of access
- Dependent on Fly.io recovery

**Current Protection**: None if only on Fly.io

**Risk Level**: LOW (but catastrophic if occurs)

---

## Recommended Backup Strategy

### Three-Layer Protection System

```
┌─────────────────────────────────────────┐
│  Layer 1: Fly.io Automatic Snapshots    │
│  • Daily snapshots                       │
│  • 60-day retention                      │
│  • Fast recovery                         │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  Layer 2: External S3 Backups           │
│  • Daily automated backups               │
│  • Independent storage                   │
│  • Indefinite retention                  │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  Layer 3: Critical File Exports         │
│  • Application-level exports             │
│  • Real-time for important docs          │
│  • User-initiated downloads              │
└─────────────────────────────────────────┘
```

### Layer 1: Optimize Fly.io Snapshots

**Immediate Action**:

Edit `fly.toml` to increase snapshot retention:

```toml
[mounts]
  source = "workspace"
  destination = "/workspace"
  snapshot_retention = 60  # Maximum retention
```

**Deploy the change**:
```bash
fly deploy --app my-jarvis-lilah --update-only
```

**Benefit**: 60 days of snapshot history instead of 5 days

### Layer 2: Automated External Backups

**Goal**: Daily backups to S3-compatible storage, independent of Fly.io

**Implementation Options**:

#### Option A: GitHub Actions (Recommended)

Create `.github/workflows/backup-lilah.yml`:

```yaml
name: Backup Lilah's Workspace

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Fly CLI
        run: |
          curl -L https://fly.io/install.sh | sh
          echo "$HOME/.fly/bin" >> $GITHUB_PATH

      - name: Authenticate with Fly.io
        run: echo "${{ secrets.FLY_API_TOKEN }}" | flyctl auth login --access-token

      - name: Create backup tarball
        run: |
          DATE=$(date +%Y-%m-%d)
          flyctl ssh console --app my-jarvis-lilah -C \
            "tar czf /tmp/workspace-backup-${DATE}.tar.gz -C /workspace ."

      - name: Download backup
        run: |
          DATE=$(date +%Y-%m-%d)
          mkdir -p backups
          flyctl ssh sftp get /tmp/workspace-backup-${DATE}.tar.gz \
            backups/lilah-workspace-${DATE}.tar.gz --app my-jarvis-lilah

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          DATE=$(date +%Y-%m-%d)
          aws s3 cp backups/lilah-workspace-${DATE}.tar.gz \
            s3://my-jarvis-backups/lilah/${DATE}/workspace-backup.tar.gz

      - name: Upload to GitHub Artifacts (Alternative)
        uses: actions/upload-artifact@v3
        with:
          name: lilah-workspace-backup-${{ github.run_number }}
          path: backups/
          retention-days: 90
```

**Secrets to configure in GitHub**:
- `FLY_API_TOKEN` - Fly.io API token
- `AWS_ACCESS_KEY_ID` - S3 credentials
- `AWS_SECRET_ACCESS_KEY` - S3 credentials

#### Option B: External Cron Service

Use a server or cloud function to run daily backups:

```bash
#!/bin/bash
# backup-lilah.sh

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="lilah-workspace-${DATE}.tar.gz"

# Create backup in Fly.io container
fly ssh console --app my-jarvis-lilah -C \
  "tar czf /tmp/${BACKUP_FILE} -C /workspace ."

# Download backup
fly ssh sftp get /tmp/${BACKUP_FILE} \
  /local/backups/${BACKUP_FILE} --app my-jarvis-lilah

# Upload to S3
aws s3 cp /local/backups/${BACKUP_FILE} \
  s3://my-jarvis-backups/lilah/${DATE}/

# Clean up old backups (keep 90 days)
find /local/backups -name "lilah-workspace-*.tar.gz" -mtime +90 -delete

# Verify backup integrity
tar tzf /local/backups/${BACKUP_FILE} > /dev/null && \
  echo "Backup verified: ${BACKUP_FILE}" || \
  echo "ERROR: Backup corrupted!"
```

**Schedule with cron**:
```cron
0 2 * * * /path/to/backup-lilah.sh >> /var/log/lilah-backup.log 2>&1
```

### Layer 3: Real-Time Critical File Protection

**For Ultra-Important Documents**:

Add application feature to auto-export critical files:

```typescript
// In app - when user creates/edits important document
async function protectCriticalFile(filePath: string) {
  // Copy to external storage immediately
  await uploadToS3(filePath, {
    bucket: 'my-jarvis-critical-docs',
    path: `lilah/${new Date().toISOString()}/${filePath}`
  });

  // Create local backup copy
  await fs.copyFile(
    filePath,
    `/workspace/backups/${path.basename(filePath)}.backup`
  );
}
```

---

## Backup Testing & Verification

### Monthly Restore Test

**Purpose**: Ensure backups actually work when needed

**Procedure**:

1. **Test Snapshot Restore**:
```bash
# List snapshots
fly volumes snapshots list <volume-id> --app my-jarvis-lilah

# Create test volume from snapshot
fly volumes create workspace-test \
  --snapshot-id <latest-snapshot-id> \
  --region sjc \
  --size-gb 1

# Verify data
fly ssh console --app my-jarvis-lilah -C \
  "ls -lah /mnt/test-volume/tickets/"
```

2. **Test S3 Backup Restore**:
```bash
# Download latest backup
aws s3 cp s3://my-jarvis-backups/lilah/latest/workspace-backup.tar.gz .

# Extract and verify
tar xzf workspace-backup.tar.gz -C /tmp/restore-test
ls -lah /tmp/restore-test/tickets/

# Check file integrity
find /tmp/restore-test -type f -name "*.pdf" -exec file {} \;
```

3. **Document Results**:
   - ✅ Snapshot restore time: X minutes
   - ✅ S3 backup restore time: Y minutes
   - ✅ Files verified: Z files
   - ⚠️ Issues found: None / List issues

---

## Recovery Procedures

### Full Disaster Recovery

**Scenario**: Complete volume loss, need to restore everything

**Steps**:

1. **Create new volume from latest snapshot**:
```bash
fly volumes create workspace \
  --snapshot-id <latest-snapshot-id> \
  --region sjc \
  --size-gb 1 \
  --app my-jarvis-lilah
```

2. **If snapshot too old, restore from S3**:
```bash
# Download latest backup
aws s3 cp s3://my-jarvis-backups/lilah/latest/workspace-backup.tar.gz .

# Create fresh volume
fly volumes create workspace --region sjc --size-gb 1 --app my-jarvis-lilah

# SSH into container
fly ssh console --app my-jarvis-lilah

# Extract backup
cd /workspace
tar xzf /tmp/workspace-backup.tar.gz
```

3. **Restart application**:
```bash
fly machine restart <machine-id> --app my-jarvis-lilah
```

4. **Verify**:
   - [ ] App accessible
   - [ ] Files present in file tree
   - [ ] Claude authentication works
   - [ ] Recent documents visible

### Partial File Recovery

**Scenario**: User accidentally deleted specific files

**Steps**:

1. **Check most recent snapshot**:
```bash
fly volumes snapshots list <volume-id>
```

2. **If recent enough, restore specific files**:
```bash
# Create temporary volume from snapshot
fly volumes create temp-restore \
  --snapshot-id <snapshot-id> \
  --region sjc

# Mount both volumes temporarily (requires app config change)
# Copy specific files
# Delete temporary volume
```

3. **Alternative: Restore from S3 backup**:
```bash
# Download backup
aws s3 cp s3://my-jarvis-backups/lilah/2025-10-16/workspace-backup.tar.gz .

# Extract specific files
tar xzf workspace-backup.tar.gz path/to/deleted/file

# Upload back to container
fly ssh sftp shell --app my-jarvis-lilah
put restored-file /workspace/path/to/file
```

---

## Implementation Checklist

### Immediate Actions (Do Today)

- [ ] **Update fly.toml snapshot retention to 60 days**
  ```bash
  # Edit fly.toml
  # Add: snapshot_retention = 60
  fly deploy --app my-jarvis-lilah --update-only
  ```

- [ ] **Create S3 bucket for backups**
  ```bash
  aws s3 mb s3://my-jarvis-backups
  aws s3api put-bucket-versioning \
    --bucket my-jarvis-backups \
    --versioning-configuration Status=Enabled
  ```

- [ ] **Set up GitHub Actions backup workflow**
  - Create `.github/workflows/backup-lilah.yml`
  - Add secrets to GitHub repository
  - Test manual workflow run

### This Week

- [ ] **Document recovery procedures** (this ticket)
- [ ] **Test snapshot restore process**
- [ ] **Test S3 backup restore process**
- [ ] **Set up backup monitoring/alerts**
- [ ] **Create backup verification script**

### This Month

- [ ] **Schedule monthly restore drill**
- [ ] **Implement backup retention policy** (keep 90 days)
- [ ] **Add backup dashboard/reporting**
- [ ] **Document Lilah-specific recovery procedures**

### Ongoing

- [ ] **Monitor backup job success daily**
- [ ] **Review backup logs weekly**
- [ ] **Test restore monthly**
- [ ] **Update documentation as needed**

---

## Monitoring & Alerts

### Backup Success Tracking

**What to Monitor**:
- ✅ Daily backup job completes successfully
- ✅ Backup file size is reasonable (not 0 bytes or suspiciously small)
- ✅ S3 upload succeeds
- ⚠️ Backup job fails
- ⚠️ Backup size anomaly

**Alerting Options**:

1. **GitHub Actions Email Notifications**:
   - Automatically sent on workflow failure
   - Configure in GitHub settings

2. **S3 Event Notifications**:
```bash
# Configure SNS topic for backup uploads
aws sns create-topic --name my-jarvis-backup-alerts
aws s3api put-bucket-notification-configuration \
  --bucket my-jarvis-backups \
  --notification-configuration file://notification.json
```

3. **Simple Daily Check Script**:
```bash
#!/bin/bash
# check-backup.sh

LATEST_BACKUP=$(aws s3 ls s3://my-jarvis-backups/lilah/ | sort | tail -1)
BACKUP_DATE=$(echo $LATEST_BACKUP | awk '{print $1}')
TODAY=$(date +%Y-%m-%d)

if [ "$BACKUP_DATE" != "$TODAY" ]; then
  echo "WARNING: No backup created today!"
  # Send email/Slack notification
fi
```

---

## Cost Analysis

### Fly.io Snapshot Costs

- **Snapshots**: Included in volume pricing
- **Retention**: No additional cost for 1-60 days
- **Volume Storage**: ~$0.15/GB/month

**Lilah's Volume**: 1GB = ~$0.15/month

### External Backup Costs

**S3 Standard Storage**:
- First 50 TB: $0.023/GB/month
- **Estimated**: 1GB daily backup × 90 days = ~$2.07/month

**GitHub Actions**:
- Free tier: 2,000 minutes/month
- Backup job: ~5 minutes/day = 150 minutes/month
- **Cost**: $0 (within free tier)

**Total Estimated Cost**: ~$2.25/month for comprehensive backups

---

## Technical Notes

### Why Fly.io Snapshots Alone Aren't Enough

1. **Single Point of Failure**: Snapshots stored on Fly.io infrastructure
2. **Limited Retention**: Maximum 60 days
3. **Timing**: Daily snapshots could lose up to 24 hours of work
4. **No Cross-Region**: Snapshots in same region as volume

### Why External Backups Are Critical

1. **Independence**: Not dependent on Fly.io infrastructure
2. **Long-term Retention**: Can keep forever
3. **Portability**: Can restore to any platform
4. **Disaster Recovery**: Protection against regional failures

### Volume Fork vs Snapshot

**Volume Fork**:
- Creates full copy of volume
- Can be used immediately
- Same region as source
- Use for: Testing, staging, immediate backup

**Snapshot**:
- Point-in-time backup
- Must create new volume to use
- Can specify different region
- Use for: Disaster recovery, historical backups

---

## Resources & Documentation

### Fly.io Documentation
- [Fly Volumes Overview](https://fly.io/docs/volumes/overview/)
- [Manage Volume Snapshots](https://fly.io/docs/volumes/snapshots/)
- [Volume Management](https://fly.io/docs/volumes/volume-manage/)
- [Fly.io Blog: Volumes Expand & Restore](https://fly.io/blog/volumes-expand-restore/)

### Command Reference

```bash
# Volumes
fly volumes list --app my-jarvis-lilah
fly volumes create <name> --region <region> --size-gb <size>
fly volumes fork <volume-id> --region <region>
fly volumes destroy <volume-id>

# Snapshots
fly volumes snapshots list <volume-id>
fly volumes snapshots create <volume-id>
fly volumes create <name> --snapshot-id <snapshot-id>

# SSH & SFTP
fly ssh console --app my-jarvis-lilah
fly ssh sftp shell --app my-jarvis-lilah
fly ssh sftp get <remote-path> <local-path>
fly ssh sftp put <local-path> <remote-path>
```

---

## Lessons Learned

### Key Takeaways

1. **Never Trust Single Storage**: Always have independent backups
2. **Test Restores**: Backups are worthless if you can't restore
3. **Automate Everything**: Manual backups will be forgotten
4. **Monitor Continuously**: Know immediately when backups fail
5. **Document Procedures**: Future you will thank present you

### Best Practices

- ✅ Multiple backup layers (3-2-1 rule)
- ✅ Automated backup processes
- ✅ Regular restore testing
- ✅ Independent backup storage
- ✅ Long retention periods for critical data
- ✅ Monitoring and alerting
- ✅ Documented recovery procedures

---

## Next Steps

1. **Implement Layer 1**: Update snapshot retention ← **DO THIS TODAY**
2. **Implement Layer 2**: Set up automated S3 backups ← **DO THIS WEEK**
3. **Test Recovery**: Run full restore test ← **DO THIS WEEK**
4. **Monitor**: Set up alerts and monitoring ← **DO THIS MONTH**
5. **Document**: Create runbook for Lilah-specific recovery ← **DO THIS MONTH**

---

**Status**: 📋 Documentation Complete, Implementation Pending
**Owner**: Development Team
**Reviewer**: Erez
**Next Review**: After implementation

---

*This ticket represents critical infrastructure for protecting Lilah's data. Treat this with highest priority as data loss would be catastrophic for our first production client.*
