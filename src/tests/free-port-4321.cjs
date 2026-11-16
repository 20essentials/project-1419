const { execSync } = require("node:child_process");

const out = execSync("netstat -ano", { encoding: "utf8" });
const ports = ["4321", "8787"];
const pids = new Set();
for (const line of out.split(/\r?\n/)) {
  for (const port of ports) {
    if (line.includes(`:${port} `) && line.includes("LISTENING")) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== "0") pids.add(pid);
    }
  }
}
for (const pid of pids) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    console.log(`[free-port] killed ${pid}`);
  } catch {
    console.log(`[free-port] no se pudo matar ${pid}`);
  }
}
if (pids.size === 0) console.log("[free-port] 4321 y 8787 libres");
