"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var jobSchedule_exports = {};
__export(jobSchedule_exports, {
  startCalculationJob: () => startCalculationJob,
  startCheckStatesAndConnectionJob: () => startCheckStatesAndConnectionJob,
  startRefreshAccessTokenTimerJob: () => startRefreshAccessTokenTimerJob,
  startResetValuesJob: () => startResetValuesJob
});
module.exports = __toCommonJS(jobSchedule_exports);
var import_node_schedule = require("node-schedule");
var import_mqttService = require("./mqttService");
var import_webService = require("./webService");
var import_calculationService = require("./calculationService");
const refreshAccessToken = async (adapter) => {
  var _a, _b;
  adapter.log.info(`[startRefreshAccessTokenTimerJob] Stop connections!`);
  if (adapter.resetValuesJob) {
    adapter.resetValuesJob.cancel();
  }
  if (adapter.checkStatesJob) {
    (_a = adapter.checkStatesJob) == null ? void 0 : _a.cancel();
  }
  if (adapter.calculationJob) {
    adapter.calculationJob.cancel();
  }
  if (adapter.mqttClient) {
    adapter.mqttClient.end();
  }
  adapter.log.info(
    `[startRefreshAccessTokenTimerJob] Refreshing accessToken in 10 seconds!`
  );
  await adapter.delay(10 * 1e3);
  adapter.resetValuesJob = void 0;
  adapter.checkStatesJob = void 0;
  adapter.calculationJob = void 0;
  adapter.mqttClient = void 0;
  if (adapter.config.userName && adapter.config.password) {
    (_b = (0, import_webService.login)(adapter)) == null ? void 0 : _b.then((_accessToken) => {
      adapter.accessToken = _accessToken;
      adapter.lastLogin = /* @__PURE__ */ new Date();
      adapter.setState("info.connection", true, true);
      (0, import_mqttService.connectMqttClient)(adapter);
    });
  }
};
const startRefreshAccessTokenTimerJob = async (adapter) => {
  adapter.refreshAccessTokenInterval = adapter.setInterval(
    () => {
      refreshAccessToken(adapter);
    },
    3 * 60 * 60 * 1e3
  );
};
const startResetValuesJob = async (adapter) => {
  adapter.resetValuesJob = (0, import_node_schedule.scheduleJob)("5 0 0 * * *", () => {
    (0, import_calculationService.resetTodaysValues)(adapter);
  });
};
const startCalculationJob = async (adapter) => {
  adapter.calculationJob = (0, import_node_schedule.scheduleJob)("*/30 * * * * *", () => {
    adapter.deviceList.forEach((device) => {
      (0, import_calculationService.calculateEnergy)(adapter, device.productKey, device.deviceKey);
    });
  });
};
const startCheckStatesAndConnectionJob = async (adapter) => {
  const statesToReset = [
    "outputHomePower",
    "outputPackPower",
    "packInputPower",
    "solarInputPower"
  ];
  let refreshAccessTokenNeeded = false;
  adapter.log.debug(
    `[checkStatesJob] Starting check of states and connection!`
  );
  adapter.checkStatesJob = (0, import_node_schedule.scheduleJob)("*/5 * * * *", async () => {
    adapter.deviceList.forEach(async (device) => {
      if (refreshAccessTokenNeeded) {
        return;
      }
      const lastUpdate = await (adapter == null ? void 0 : adapter.getStateAsync(
        device.productKey + "." + device.deviceKey + ".lastUpdate"
      ));
      const wifiState = await (adapter == null ? void 0 : adapter.getStateAsync(
        device.productKey + "." + device.deviceKey + ".wifiState"
      ));
      const fiveMinutesAgo = (Date.now() / 1e3 - 5 * 60) * 1e3;
      const tenMinutesAgo = (Date.now() / 1e3 - 10 * 60) * 1e3;
      if (lastUpdate && lastUpdate.val && Number(lastUpdate.val) < fiveMinutesAgo && (wifiState == null ? void 0 : wifiState.val) == "Connected") {
        adapter.log.warn(
          `[checkStatesJob] Last update for deviceKey ${device.deviceKey} was at ${new Date(
            Number(lastUpdate)
          )}, device seems to be online - so maybe connection is broken - restart adapter in 20 seconds!`
        );
        await adapter.delay(20 * 1e3);
        adapter.restart();
        refreshAccessTokenNeeded = true;
      }
      if (lastUpdate && lastUpdate.val && Number(lastUpdate.val) < tenMinutesAgo && !refreshAccessTokenNeeded) {
        adapter.log.debug(
          `[checkStatesJob] Last update for deviceKey ${device.deviceKey} was at ${new Date(
            Number(lastUpdate)
          )}, checking for pseudo power values!`
        );
        await statesToReset.forEach(async (stateName) => {
          await (adapter == null ? void 0 : adapter.setStateAsync(
            device.productKey + "." + device.deviceKey + "." + stateName,
            0,
            true
          ));
        });
        if (device.electricity) {
          await (adapter == null ? void 0 : adapter.setStateAsync(
            device.productKey + "." + device.deviceKey + ".electricLevel",
            device.electricity,
            true
          ));
        }
      }
    });
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startCalculationJob,
  startCheckStatesAndConnectionJob,
  startRefreshAccessTokenTimerJob,
  startResetValuesJob
});
//# sourceMappingURL=jobSchedule.js.map
