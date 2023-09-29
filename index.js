import input from "@inquirer/input";
import select from "@inquirer/select";
import checkbox from "@inquirer/checkbox";
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

  message.topic = topics.length === 1 ? topics[0] : undefined;
  message.conditions =
    topics.length > 1
      ? topics.join(" in topics || ").concat(" in topics")
      : undefined;
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

  message.token = targets.length === 1 ? targets[0] : undefined;
  message.tokens = targets.length > 1 ? targets : undefined;

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
    title: chalk.bgGreen("Firebase Payload (getMessage.Send):"),
    titleAlignment: "center",
    padding: 1,
  })
);

clipboard.writeSync(jsonMessage);

console.log(chalk.bgGreen("JSON copied to clipboard."));
