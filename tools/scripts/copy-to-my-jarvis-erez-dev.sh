#!/bin/bash
# Logs and status checker for my-jarvis-erez-dev

export FLY_API_TOKEN="FlyV1 fm2_lJPECAAAAAAACWXAxBD4wZLjdy0KH/gHVY07T1amwrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABH5Hh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDyjor0WeJJUGddKQC/Ls02BMU0+zQg4iYEsXbidq0X5QyBGW62rayQg5MU6ya2ZQv39fdKL5A43TSgCCiXETnoTQAOvXjC9TuhmMZUUrBN5GfHitBX+L/VWtgkmlTxeu4fq9L2+rhH6LM8MXHld+5yLlZrKaQNXLqlMaUpGenBNRFbX9LrCJOvKYtoJb8Qgk6tsoth/oq6dfkGlkZTcxMkR5zsmybqaScTul518Mk8=,fm2_lJPETnoTQAOvXjC9TuhmMZUUrBN5GfHitBX+L/VWtgkmlTxeu4fq9L2+rhH6LM8MXHld+5yLlZrKaQNXLqlMaUpGenBNRFbX9LrCJOvKYtoJb8QQt/5UMZEQDANDOVzQ+jWs4sO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5o9eXBzwAAAAEk7gPfF84AEUYOCpHOABFGDgzEELpKGNnE93RBiZblYGU7ZJ7EIEQ/Mha3mLxV0Ds1tqNZoFsxKC2jg/cjiW2SOrCxFKGx"

cd /workspace/my-jarvis/projects/my-jarvis-desktop

# Show app status
echo "=== App Status ==="
/root/.fly/bin/flyctl status --app my-jarvis-erez-dev

echo ""
echo "=== Recent Logs ==="
/root/.fly/bin/flyctl logs --app my-jarvis-erez-dev --no-tail

echo ""
echo "=== Machine Info ==="
/root/.fly/bin/flyctl machine list --app my-jarvis-erez-dev
