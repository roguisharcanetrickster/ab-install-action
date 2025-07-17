const core = require("@actions/core");
const exec = require("@actions/exec");

async function installAb() {
   const folder = core.getInput("folder") || "AppBuilder";
   const stack = core.getInput("stack") || "ab";
   const runtime = core.getInput("runtime") || null;
   const installOpts = [
      `--stack=${stack}`,
      `--port=${core.getInput("port") || 80}`,
      "--dbExpose=false",
      "--dbPassword=root",
      "--tag=latest",
      "--authType=login",
      "--relayEnabled=false",
      "--pwaURL=http://pwa.site.com",
      "--siteURL=http://auth.site.com",
      "--tenant.username=admin",
      "--tenant.password=admin",
      "--tenant.email=admin@email.com",
      `--tenant.url=http://localhost:${core.getInput("port") || 80}`,
   ];

   if (runtime) installOpts.push(`--runtime=${runtime}`);

   // check if in swarm
   let infoOutput = "";
   await exec.exec('docker info --format "{{.Swarm.LocalNodeState}}"', [], {
       listeners: {
           stdout: (data) => {
               infoOutput += data.toString();
           },
       },
       silent: true,
   });
   if (infoOutput.trim() !== "active") {
       core.startGroup("Initiliazing Docker Swarm");
       await exec.exec("docker swarm init");
       core.endGroup();
   } else {
       core.info("Already part of a swarm, continuing...");
   }

   core.startGroup("Installing AppBuilder");

   await exec.exec(`npm i https://github.com/CruGlobal/ab-cli -g`);

   await exec.exec(`appbuilder install ${folder}`, installOpts);
   core.endGroup();

   core.startGroup("Waiting for the Stack to come down");
   await waitClosed(stack, 1);
   core.endGroup();

   core.startGroup("starting test AppBuilder");

   await exec.exec(`npm run test:boot`);
   await exec.exec(`npm run test:boot`);

   core.endGroup();

   return;
}

module.exports = installAb;

function waitClosed(stack, attempt, pending = []) {
   return new Promise((resolve) => {
      let output = "";

      const options = {
         silent: true,
      };
      options.listeners = {
         stdout: (data) => {
            output += data.toString();
         },
      };

      core.info(`Checking the network (${attempt})`);
      exec.exec(`docker network ls`, [], options).then(() => {
         if (output.includes(`${stack}_default`)) {
            // stack is found so:
            setTimeout(() => {
               attempt++;
               waitClosed(stack, attempt, pending);
               pending.push(resolve);
            }, 1000);
         } else {
            core.info("Stack is Down");
            pending.forEach((res) => {
               res();
            });
            resolve();
         }
      });
   });
}
