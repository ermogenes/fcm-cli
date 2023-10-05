import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import serviceAccount from "./secrets/serviceAccountKey.json" assert { type: "json" };

import input from "@inquirer/input";
import select from "@inquirer/select";
import checkbox from "@inquirer/checkbox";
import confirm from "@inquirer/confirm";
import clear from "clear";
import chalk from "chalk";
import fs from "fs";
import { loremIpsum } from "lorem-ipsum";
import colorizeJson from "json-colorizer";
import clipboard from "clipboardy";
import boxen from "boxen";

clear();

const config = JSON.parse(fs.readFileSync("config.json"));

let message = {};

const messageType = await select({
  message: "Topic or target?",
  choices: [
    {
      name: "topic",
      value: "topic",
      description: "Send message to one or more topics",
    },
    {
      name: "target",
      value: "target",
      description: "Send message to one or more targets",
    },
  ],
});

console.log(chalk.redBright(messageType));

if (messageType == "topic") {
  const topics = await checkbox({
    message: "Which topics?",
    choices: config.topics.map((topic) => ({ name: topic, value: topic })),
  });

  if (topics.length === 1) {
    message.topic = topics[0];
  } else if (topics.length > 1) {
    message.condition = topics
      .map((topic) => `\'${topic}\'`)
      .join(" in topics || ")
      .concat(" in topics");
  }

  console.log(chalk.redBright(topics.join(", ")));
}

if (messageType == "target") {
  const targets = await checkbox({
    message: "Which targets?",
    choices: config.targets.map((target) => ({
      name: target.token,
      value: target.token,
    })),
  });

  if (targets.length === 1) {
    message.token = targets[0];
  } else if (targets.length > 1) {
    message.tokens = targets;
  }

  console.log(chalk.redBright(targets.join(", ")));
}

let messageTitle = await input({
  message: "Message title (enter to generate random text): ",
});

if (messageTitle.length === 0)
  messageTitle = loremIpsum({ count: 5, units: "words" });

let messageBody = await input({
  message: "Message body (enter to generate random text): ",
});

if (messageBody.length === 0)
  messageBody = loremIpsum({ count: 3, units: "sentences" });

message.notification = { title: messageTitle, body: messageBody };

console.log("\n");

const jsonMessage = JSON.stringify(message, null, 4);

console.log(
  boxen(colorizeJson(jsonMessage, { pretty: true }), {
    title: chalk.bgGreen(`Firebase Payload:`),
    titleAlignment: "center",
    padding: 1,
  })
);

clipboard.writeSync(jsonMessage);

console.log(chalk.bgGreen("JSON copied to clipboard."));

console.log();
const sendIt = await confirm({ message: "Send it?" });

if (sendIt) {
  initializeApp({
    credential: cert(serviceAccount),
  });

  if (message.tokens) {
    // multicast
    getMessaging()
      .sendEachForMulticast(message)
      .then((response) => {
        if (response.failureCount > 0) {
          console.log("Error sending message:", response);
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(message.tokens[idx]);
            }
          });
          console.log("List of tokens that caused failures: " + failedTokens);
        } else {
          console.log("Successfully sent message:", response);
        }
      });
  } else {
    // single cast
    getMessaging()
      .send(message)
      .then((response) => {
        console.log("Successfully sent message:", response);
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  }
}
