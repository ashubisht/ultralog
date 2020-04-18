import { Logger } from "./../index";

const logger = Logger.getInstance();
logger.configure({
    accessKeyId: "accessKey",
    level: "silly",
    logGroup: "anchors-grp",
    logStream: "anchors-app-stream",
    region: "ap-southeast-2",
    secretKey: "accessSecret"
})

logger.info("sample", "no-function/global ctx", "This is a sample message");

// Print with verbose details
logger.setVerbose(true);
logger.info("sample", "no-function/global ctx", "This is a sample message with verbose details");

console.log("Done");
/* Program doesnt quits here.
** Suspect that an event or callback is opened.
** This maybe from stream opened by logger but never closed.
** In my opinion, this is expected
*/