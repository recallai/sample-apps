# Separate audio streams per participant

## Pre-requisites

- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

** Before running, make sure you don't have any apps running on port 4000 **

1. Open this directory in a terminal

2. In the same terminal, run the following to start a server on port 4000:

```
npm install
npm run dev
```

3. In a new terminal window, run `ngrok http 4000`. After its running, copy the URL that is ngrok is hosting (e.g. https://somehash.ngrok.app)

4. In a new terminal window, create a bot:

```
curl --request POST \
--url https://us-west-2.recall.ai/api/v1/bot/ \
--header 'Authorization: RECALL_API_KEY' \
--header 'accept: application/json' \
--header 'content-type: application/json' \
--data '{
  "meeting_url": "YOUR_MEETING_URL",
  "recording_config": {
    "realtime_endpoints": [
      {
        "type": "websocket",
        "url": "wss://YOUR_NGROK_URL/ws",
        "events": [
          "audio_separate_raw.data"
        ]
      }
    ],
    "audio_separate_raw": {}
  }
}'
```

** \*\*NOTE: ngrok will give you a url like `https://somehash.ngrok.app`. Make sure you replace `https://` with `wss://` as you are using WebSockets instead of HTTP **

5. After the call ends, you can see the audio in the newly-generated output folder
