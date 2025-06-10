import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const datafilePath = path.join(__dirname, "..", "data");
console.log("Loading data from:", datafilePath);
