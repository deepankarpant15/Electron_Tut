import osUtils from 'os-utils';
import os from 'os'
import fs from 'fs';
import { BrowserWindow } from 'electron';
const POLLING_INTERVAL = 500;

export function pollResources(mainWindow: BrowserWindow) {

    setInterval(async() => {
        const cpuUsage = await getCpuUsage();  
        const ramUsage = getRamUsage();
        const storageData = getStorageData();
        mainWindow.webContents.send('statistics', {
            cpuUsage,ramUsage,storageUsage: storageData.usage

        });
      //  console.log(`CPU Usage : ${cpuUsage}, Ram Usage :${ramUsage} , ${storageUsage: storageData.usage}`);      
      //console.log({cpuUsage,ramUsage,storageUsage: storageData.usage})
    }, POLLING_INTERVAL);
}

function getCpuUsage(){
    // install os utils npm i   osUtils.cpuUsage((percentage)=> console.log(percentage));
    return new Promise(resolve=>{
        osUtils.cpuUsage(resolve)
    })
}

function getRamUsage(){
 return 1 - osUtils.freememPercentage();
}


export function getStaticData() {
  const totalStorage = getStorageData().total;
  const cpuModel = os.cpus()[0].model;
  const totalMemoryGB = Math.floor(osUtils.totalmem() / 1024);

  return {
    totalStorage,
    cpuModel,
    totalMemoryGB,
  };
}

function getStorageData() {
  // requires node 18
  // give sync file stats
  const stats = fs.statfsSync(process.platform === 'win32' ? 'C://' : '/');
  const total = stats.bsize * stats.blocks;
  const free = stats.bsize * stats.bfree;

  return {
    total: Math.floor(total / 1_000_000_000),
    usage: 1 - free / total,
  };
}
