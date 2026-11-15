// Bouwt de app uit src/:
//  - www/index.html      : voor de Capacitor-app (three.js lokaal, werkt offline)
//  - dist/artifact.html  : voor de Claude-artifact (three.js via jsDelivr, zonder <html>-skelet)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/borderplan.html"), "utf8");
const prompts = fs
  .readFileSync(path.join(root, "src/prompts.mjs"), "utf8")
  .replace(/^\/\/.*$/gm, "")
  .replace(/export (const|function)/g, "$1")
  .trim();

const THREE_VERSION = "0.147.0";
const withPrompts = src.replace("/*@PROMPTS@*/", prompts);

// Artifact-versie
const cdn = [
  `<script src="https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.min.js"></script>`,
  `<script src="https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/js/controls/OrbitControls.js"></script>`,
].join("\n");
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/artifact.html"), withPrompts.replace("<!--@THREE@-->", cdn));

// App-versie
const www = path.join(root, "www");
fs.mkdirSync(path.join(www, "vendor"), { recursive: true });
const three = path.join(root, "node_modules/three");
fs.copyFileSync(path.join(three, "build/three.min.js"), path.join(www, "vendor/three.min.js"));
fs.copyFileSync(path.join(three, "examples/js/controls/OrbitControls.js"), path.join(www, "vendor/OrbitControls.js"));
const local = [
  `<script src="config.js"></script>`,
  `<script src="vendor/three.min.js"></script>`,
  `<script src="vendor/OrbitControls.js"></script>`,
].join("\n");
const head = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
`;
fs.writeFileSync(path.join(www, "index.html"), head + withPrompts.replace("<!--@THREE@-->", local) + "\n</body>\n</html>\n");
const cfg = path.join(www, "config.js");
const api = process.env.BORDERPLAN_API || "";
fs.writeFileSync(cfg, `// Adres van de Borderplan-server voor het inlezen van foto's (leeg = uit).\nwindow.BORDERPLAN_API = ${JSON.stringify(api)};\n`);
console.log("Gebouwd: www/index.html en dist/artifact.html" + (api ? ` (server: ${api})` : " (zonder server)"));
