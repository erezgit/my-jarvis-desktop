#!/bin/bash
# My Jarvis Desktop One-Time Health Check
# Usage: ./health-check.sh

echo "🔍 My Jarvis Desktop Health Check - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="

# Check if app is running
PROCESSES=$(ps aux | grep -i "MyJarvisDesktop" | grep -v grep | grep -v "chrome_crashpad")

if [ -z "$PROCESSES" ]; then
    echo "❌ My Jarvis Desktop is NOT running"
    exit 1
fi

echo "✅ My Jarvis Desktop is running"
echo ""

# Process count
PROCESS_COUNT=$(echo "$PROCESSES" | wc -l | tr -d ' ')
echo "📦 Process Count: $PROCESS_COUNT"

# Memory usage
TOTAL_MEM=$(echo "$PROCESSES" | awk '{sum += $6} END {print sum/1024}')
printf "💾 Total Memory: %.2f MB\n" $TOTAL_MEM

# CPU usage
TOTAL_CPU=$(echo "$PROCESSES" | awk '{sum += $3} END {print sum}')
printf "⚡ Total CPU: %.1f%%\n" $TOTAL_CPU

echo ""
echo "📋 Process Details:"
echo "$PROCESSES" | awk '{
    if ($11 ~ /Main/) type = "Main Process"
    else if ($12 ~ /gpu-process/) type = "GPU Process"
    else if ($12 ~ /renderer/) type = "Renderer"
    else if ($12 ~ /utility/) {
        if ($14 ~ /audio/) type = "Audio Service"
        else if ($14 ~ /network/) type = "Network Service"
        else type = "Utility"
    }
    else type = "Helper"

    printf "  %-20s PID: %-6s CPU: %5s%%  MEM: %6.0f MB\n", type, $2, $3, $6/1024
}'

# Check for zombies
ZOMBIES=$(ps aux | grep -i "MyJarvisDesktop" | grep -i "<defunct>" | grep -v grep)
if [ ! -z "$ZOMBIES" ]; then
    echo ""
    echo "⚠️  ZOMBIE PROCESSES DETECTED:"
    echo "$ZOMBIES"
    ZOMBIE_COUNT=$(echo "$ZOMBIES" | wc -l | tr -d ' ')
    echo "   Total zombies: $ZOMBIE_COUNT"
fi

# Backend server health
echo ""
echo "🔌 Backend Server:"
HEALTH_CHECK=$(curl -s http://127.0.0.1:8081/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "  ✅ Server responding on port 8081"
    if command -v jq &> /dev/null; then
        echo "$HEALTH_CHECK" | jq '.'
    else
        echo "  $HEALTH_CHECK"
    fi
else
    echo "  ❌ Server NOT responding on port 8081"
fi

# Network connections
echo ""
echo "🔗 Listening Ports:"
PORTS=$(lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | grep -i "MyJarvisDesktop" | awk '{print $9}' | sort -u)
if [ ! -z "$PORTS" ]; then
    echo "$PORTS" | while read port; do
        echo "  • $port"
    done
else
    echo "  No listening ports found"
fi

# Memory trend check (if running for a while)
echo ""
echo "💡 Tips:"
if (( $(echo "$TOTAL_MEM > 1000" | bc -l) )); then
    echo "  ⚠️  High memory usage (>1GB) - consider restarting if it continues to grow"
fi
if (( $(echo "$TOTAL_CPU > 50" | bc -l) )); then
    echo "  ⚠️  High CPU usage (>50%) - check for runaway processes"
fi
if [ "$PROCESS_COUNT" -gt 10 ]; then
    echo "  ℹ️  Many helper processes ($PROCESS_COUNT) is normal for Electron apps"
fi

echo ""
echo "=================================================="
echo "✅ Health check complete"
