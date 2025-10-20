#!/bin/bash
# Check files in my-jarvis-erez-dev container

export FLY_API_TOKEN="FlyV1 fm2_lJPECAAAAAAACWXAxBApBSphg/guRgNMrW/RwP5ywrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABH5Hh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDxXOkMzdPyzk9Hx9XTUvigG0XpKFEltmKKWwoQ5qp+aQYaiq3QwxiBk46/6pZuFfkEe+kgK5jO0P5SgkmfETkvSudFEJWGhTqHlovSZpB5endkRmifbJuuA6QFFEvPvj8fwWhnDlUZ6Ny4Kqueyzg4iuBocjyD+oZ0QwV6aeNOVKFlXi0j2k1uMR91i+MQgKww203yNBws4VtfJ+v0dVd4hoSk1VTrPtTchTnA2XX0=,fm2_lJPETkvSudFEJWGhTqHlovSZpB5endkRmifbJuuA6QFFEvPvj8fwWhnDlUZ6Ny4Kqueyzg4iuBocjyD+oZ0QwV6aeNOVKFlXi0j2k1uMR91i+MQQenLJsWbslHFN3+B5w9YX0cO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5o88vmzwAAAAEk6+oEF84AEUYOCpHOABFGDgzEEDfhmzxfikSZtriBX12G4XbEIH5kKQKTxS1gw2Bzbx9WVHB17/U+x1zdlYrPlR6qHdME"

echo "Checking /workspace/my-jarvis/docs/:"
/root/.fly/bin/flyctl ssh console --app my-jarvis-erez-dev --command "ls -la /workspace/my-jarvis/docs/"

echo ""
echo "Checking /workspace/tools/scripts/:"
/root/.fly/bin/flyctl ssh console --app my-jarvis-erez-dev --command "ls -la /workspace/tools/scripts/"
