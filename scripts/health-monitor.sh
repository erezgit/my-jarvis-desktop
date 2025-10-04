#!/bin/bash
# My Jarvis Desktop Health Monitor
# Usage: ./health-monitor.sh [interval_seconds]

INTERVAL=${1:-5}  # Default to 5 seconds if not specified

echo "🔍 My Jarvis Desktop Health Monitor"
echo "Monitoring every ${INTERVAL} seconds. Press Ctrl+C to stop."
echo "=================================================="

while true; do
    clear
    echo "📊 My Jarvis Desktop Status - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=================================================="

    # Get all My Jarvis processes
    PROCESSES=$(ps aux | grep -i "MyJarvisDesktop" | grep -v grep | grep -v "chrome_crashpad")

    if [ -z "$PROCESSES" ]; then
        echo "❌ My Jarvis Desktop is NOT running"
    else
        echo "✅ My Jarvis Desktop is running"
        echo ""

        # Count processes
        PROCESS_COUNT=$(echo "$PROCESSES" | wc -l | tr -d ' ')
        echo "📦 Process Count: $PROCESS_COUNT"

        # Calculate total memory usage (in MB)
        TOTAL_MEM=$(echo "$PROCESSES" | awk '{sum += $6} END {print sum/1024}')
        printf "💾 Total Memory: %.2f MB\n" $TOTAL_MEM

        # Calculate total CPU usage
        TOTAL_CPU=$(echo "$PROCESSES" | awk '{sum += $3} END {print sum}')
        printf "⚡ Total CPU: %.1f%%\n" $TOTAL_CPU

        echo ""
        echo "📋 Process Breakdown:"
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

        # Check for zombie processes
        ZOMBIES=$(ps aux | grep -i "MyJarvisDesktop" | grep -i "<defunct>" | grep -v grep)
        if [ ! -z "$ZOMBIES" ]; then
            echo ""
            echo "⚠️  ZOMBIE PROCESSES DETECTED:"
            echo "$ZOMBIES"
        fi

        # Check backend server health
        echo ""
        echo "🔌 Backend Server Health:"
        HEALTH_CHECK=$(curl -s http://127.0.0.1:8081/api/health 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "  ✅ Server responding"
            echo "  Response: $HEALTH_CHECK" | jq '.' 2>/dev/null || echo "  Response: $HEALTH_CHECK"
        else
            echo "  ❌ Server NOT responding on port 8081"
        fi

        # Check open files/ports
        echo ""
        echo "🔗 Network Connections:"
        lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | grep -i "MyJarvisDesktop" | awk '{printf "  Port %s listening\n", $9}' | sort -u
    fi

    echo ""
    echo "=================================================="
    sleep $INTERVAL
done
