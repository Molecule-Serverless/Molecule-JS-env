curl -v --location --request GET 'http://172.17.0.1:12302/invoke' \
--header 'Step-Name: interact' \
--header 'App-Name: alexa_v2' \
--header 'Content-Type: application/json' \
--data-raw '{
    "utter" : "open smarthome to I love Taylor Swift"
}'

# Note: To see logs, add -v after curl
