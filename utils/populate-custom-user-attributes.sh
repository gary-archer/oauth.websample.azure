#!/bin/bash

####################################################################################
# Use the curl and jq tools to populate custom user attributes against user accounts
####################################################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Define parameters
#
TOKEN_ENDPOINT='https://login.microsoftonline.com/7f071fbc-8bf2-4e61-bb48-dabd8e2f5b5a/oauth2/v2.0/token'
USER_ADMIN_CLIENT_ID='0eaa10e2-62c1-4d45-aff0-4cf0ea5d39e6'
USER_ADMIN_CLIENT_SECRET=''
GRAPH_API_BASE_URL='https://graph.microsoft.com'
USER_EXTENSIONS_APP_CLIENT_ID='32ee1b779fea4ee2be2dcaf30f23d83a'
GUEST_USER_ID='151a2564-2ac3-4e67-8b31-bfab7cf81d5e'
GUEST_ADMIN_ID='a724f361-38df-47b6-aa99-13723f77c47a'
RESPONSE_FILE='./response.txt'

#
# First make a client credentials request to get an access token with permissions to edit all users
#
echo 'Calling token endpoint for the user admin client ...'
HTTP_STATUS=$(curl -s -X POST "$TOKEN_ENDPOINT" \
    -H 'accept: application/json' \
    -H 'content-type: application/x-www-form-urlencoded' \
    -d "client_id=$USER_ADMIN_CLIENT_ID" \
    -d "client_secret=$USER_ADMIN_CLIENT_SECRET" \
    -d 'grant_type=client_credentials' \
    -d 'scope=https://graph.microsoft.com/.default' \
    -o $RESPONSE_FILE \
    -w '%{http_code}')
if [ "$HTTP_STATUS" != '200' ]; then
  echo "*** Problem encountered getting an access token: $HTTP_STATUS"
  exit
fi

#
# Then extract the access token
#
TOKEN_RESPONSE=$(cat $RESPONSE_FILE)
ACCESS_TOKEN=$(jq -r .access_token <<< "$TOKEN_RESPONSE")
if [ "$HTTP_STATUS" == '' ]; then
  echo "*** Problem encountered getting an access token: $HTTP_STATUS"
  exit
fi

#
# Form extension fields needed to update custom attributes
#
MANAGER_ID_FIELD="extension_${USER_EXTENSIONS_APP_CLIENT_ID}_manager_id"
ROLE_FIELD="extension_${USER_EXTENSIONS_APP_CLIENT_ID}_role"

#
# Send a graph request to populate custom attributes for the guest user
#
REQUEST_JSON="{\"$MANAGER_ID_FIELD\": \"10345\", \"$ROLE_FIELD\": \"user\"}"
echo 'Calling Graph API to update the guest user ...'
HTTP_STATUS=$(curl -s -X PATCH "$GRAPH_API_BASE_URL/v1.0/users/$GUEST_USER_ID" \
    -H 'content-type: application/json' \
    -H "authorization: Bearer $ACCESS_TOKEN" \
    -d "$REQUEST_JSON" \
    -o $RESPONSE_FILE \
    -w '%{http_code}')
if [ "$HTTP_STATUS" != '204' ]; then
  echo "*** Problem encountered updating the guest user: $HTTP_STATUS"
  exit
fi

#
# Send a graph request to populate custom attributes for the guest admin user
#
REQUEST_JSON="{\"$MANAGER_ID_FIELD\": \"20116\", \"$ROLE_FIELD\": \"admin\"}"
echo 'Calling Graph API to update the guest admin ...'
HTTP_STATUS=$(curl -s -X PATCH "$GRAPH_API_BASE_URL/v1.0/users/$GUEST_ADMIN_ID" \
    -H 'content-type: application/json' \
    -H "authorization: Bearer $ACCESS_TOKEN" \
    -d "$REQUEST_JSON" \
    -o $RESPONSE_FILE \
    -w '%{http_code}')
if [ "$HTTP_STATUS" != '204' ]; then
  echo "*** Problem encountered updating the guest admin: $HTTP_STATUS"
  exit
fi

#
# Read back the guest user's extension attributes using the beta API, which returns all properties
#
echo 'Calling Graph API to verify the guest user ...'
HTTP_STATUS=$(curl -s -X GET "$GRAPH_API_BASE_URL/beta/users/$GUEST_USER_ID" \
    -H 'accept: application/json' \
    -H "authorization: Bearer $ACCESS_TOKEN" \
    -o $RESPONSE_FILE \
    -w '%{http_code}')
if [ "$HTTP_STATUS" != '200' ]; then
  echo "*** Problem encountered reading the guest user: $HTTP_STATUS"
  exit
fi
USER_RESPONSE=$(cat $RESPONSE_FILE)
MANAGER_ID=$(jq -r ."$MANAGER_ID_FIELD" <<< "$USER_RESPONSE")
ROLE=$(jq -r ."$ROLE_FIELD" <<< "$USER_RESPONSE")
echo "Guest user has manager_id: $MANAGER_ID and role: $ROLE"

#
# Read back the guest admin's extension attributes
#
echo 'Calling Graph API to verify the guest admin ...'
HTTP_STATUS=$(curl -s -X GET "$GRAPH_API_BASE_URL/beta/users/$GUEST_ADMIN_ID" \
    -H 'accept: application/json' \
    -H "authorization: Bearer $ACCESS_TOKEN" \
    -o $RESPONSE_FILE \
    -w '%{http_code}')
if [ "$HTTP_STATUS" != '200' ]; then
  echo "*** Problem encountered reading the guest admin: $HTTP_STATUS"
  exit
fi
USER_RESPONSE=$(cat $RESPONSE_FILE)
MANAGER_ID=$(jq -r ."$MANAGER_ID_FIELD" <<< "$USER_RESPONSE")
ROLE=$(jq -r ."$ROLE_FIELD" <<< "$USER_RESPONSE")
echo "Guest admin has manager_id: $MANAGER_ID and role: $ROLE"
