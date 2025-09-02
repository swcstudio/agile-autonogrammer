import { integrationConfigs } from '../config/integrations.config.ts';
import { ArcoIntegration } from '../integrations/arco.ts';
import { AssetManifestIntegration } from '../integrations/asset-manifest.ts';
import { CosmosIntegration } from '../integrations/cosmos.ts';
import { EMPIntegration } from '../integrations/emp.ts';
import { EsmxIntegration } from '../integrations/esmx.ts';
import { FastRefreshIntegration } from '../integrations/fast-refresh.ts';
import { InspectorIntegration } from '../integrations/inspector.ts';
import { MidsceneIntegration } from '../integrations/midscene.ts';
import { MultithreadingIntegration } from '../integrations/multithreading.ts';
import { NgrokIntegration } from '../integrations/ngrok.ts';
import { NxIntegration } from '../integrations/nx.ts';
import { ParetoIntegration } from '../integrations/pareto.ts';
import { RePackIntegration } from '../integrations/repack.ts';
import { RSpackIntegration } from '../integrations/rspack.ts';
import { RspeedyIntegration } from '../integrations/rspeedy.ts';
import { SailsIntegration } from '../integrations/sails.ts';
import { StorybookIntegration } from '../integrations/storybook.ts';
import { StyleXIntegration } from '../integrations/stylex.ts';
import { SvgrIntegration } from '../integrations/svgr.ts';
import { TanStackIntegration } from '../integrations/tanstack.ts';
import { TapableIntegration } from '../integrations/tapable.ts';
import { TauriIntegration } from '../integrations/tauri.ts';
import { TypiaIntegration } from '../integrations/typia.ts';
import { UmiIntegration } from '../integrations/umi.ts';
import { VirtualModulesIntegration } from '../integrations/virtual-modules.ts';
import { WebXRIntegration } from '../integrations/webxr.ts';
import { ZephyrIntegration } from '../integrations/zephyr.ts';
import type { KatalystIntegration } from '../types/index.ts';

export class IntegrationFactory {
  private static integrations = new Map<string, unknown>();

  static createIntegration(integration: KatalystIntegration) {
    const config = integrationConfigs[integration.name as keyof typeof integrationConfigs] || {};

    switch (integration.name) {
      case 'tanstack':
        return new TanStackIntegration(config as any);
      case 'rspack':
        return new RSpackIntegration(config as any);
      case 'emp':
        return new EMPIntegration(config as any);
      case 'esmx':
        return new EsmxIntegration(config as any);
      case 'pareto':
        return new ParetoIntegration(config as any);
      case 'repack':
        return new RePackIntegration(config as any);
      case 'umi':
        return new UmiIntegration(config as any);
      case 'rspeedy':
        return new RspeedyIntegration(config as any);
      case 'nx':
        return new NxIntegration(config as any);
      case 'arco':
        return new ArcoIntegration(config as any);
      case 'cosmos':
        return new CosmosIntegration(config as any);
      case 'stylex':
        return new StyleXIntegration(config as any);
      case 'zephyr':
        return new ZephyrIntegration(config as any);
      case 'virtual-modules':
        return new VirtualModulesIntegration(config as any);
      case 'asset-manifest':
        return new AssetManifestIntegration(config as any);
      case 'fast-refresh':
        return new FastRefreshIntegration(config as any);
      case 'typia':
        return new TypiaIntegration(config as any);
      case 'storybook':
        return new StorybookIntegration(config as any);
      case 'ngrok':
        return new NgrokIntegration(config as any);
      case 'inspector':
        return new InspectorIntegration(config as any);
      case 'svgr':
        return new SvgrIntegration(config as any);
      case 'sails':
        return new SailsIntegration(config as any);
      case 'tapable':
        return new TapableIntegration(config as any);
      case 'midscene':
        return new MidsceneIntegration(config as any);
      case 'tauri':
        return new TauriIntegration(config as any);
      case 'webxr':
        return new WebXRIntegration(config as any);
      case 'multithreading':
        return new MultithreadingIntegration(config as any);
      default:
        throw new Error(`Unknown integration: ${integration.name}`);
    }
  }

  static async initializeIntegrations(integrations: KatalystIntegration[]) {
    const results = [];

    for (const integration of integrations) {
      if (integration.enabled) {
        try {
          const instance = this.createIntegration(integration);
          const initialized = await (instance as any).initialize();
          results.push(...initialized);
          this.integrations.set(integration.name, instance);
        } catch (error) {
          console.error(`Failed to initialize ${integration.name}:`, error);
        }
      }
    }

    return results;
  }

  static getIntegration(name: string) {
    return this.integrations.get(name);
  }

  static getAllIntegrations() {
    return Array.from(this.integrations.values());
  }
}
