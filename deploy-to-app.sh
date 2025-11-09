#!/bin/bash
# Deployment script for Fly.io that handles app-specific deployment

# Check if app name was provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy-to-app.sh <app-name>"
    echo "Example: ./deploy-to-app.sh my-jarvis-erez-dev"
    exit 1
fi

APP_NAME=$1

# Create fly.toml from template
echo "Creating fly.toml for app: $APP_NAME"
cp fly.toml.template fly.toml
sed -i '' "s/APP_NAME/$APP_NAME/g" fly.toml

# Also create a specific toml file for this app for future reference
cp fly.toml "fly-${APP_NAME}.toml"

# Set the token directly (same as deploy.sh)
export FLY_API_TOKEN="FlyV1 fm2_lJPECAAAAAAACWXAxBDKFbNYGm6NnwARUrbc8wWKwrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABH5Hh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDyal1qO5Z1jfGveyr6gRCOKsjkKh9r/AXMYhP9ahKnOB+ytkN8GasPtTHcaifIELZhDJSg1D9WolYhmOpXEThpkZ97nUmMQGaX+3pnzbpb0w3yw/3FpVWddfqZAA8KEV/UOGsngPwAWLzAKa4wcWn/T2o4tcJvYXlhgWg/lNZyE83h4ssUn8321PXGa5cQgvOg+1VgiIqtXxd8e/VCSzUdf55oyiZElW/L3Ppl78pc=,fm2_lJPEThpkZ97nUmMQGaX+3pnzbpb0w3yw/3FpVWddfqZAA8KEV/UOGsngPwAWLzAKa4wcWn/T2o4tcJvYXlhgWg/lNZzE83h4ssUn8321PXGa5cQQ1pJH8DUKNjcm9yA31HeykcO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5o/UmDzwAAAAEk9WehF84AEUYOCpHOABFGDgzEED2WAeBjsEtVS12/9bRrzIHEIIsqoVDS9IxBKiu0B2EJdS/TL63R0CfMbv2UCGLPFZPk"

# Check if this is an update or new deployment
echo "Checking if app exists..."
if /opt/homebrew/bin/flyctl status --app "$APP_NAME" >/dev/null 2>&1; then
    echo "App exists. Deploying update..."
    /opt/homebrew/bin/flyctl deploy --app "$APP_NAME" --update-only
else
    echo "App doesn't exist. Creating new deployment..."
    /opt/homebrew/bin/flyctl deploy --app "$APP_NAME"
fi

echo "Deployment complete for $APP_NAME"
echo "Visit: https://$APP_NAME.fly.dev"