export class SvgrIntegration {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async setupSvgr() {
    return {
      name: 'svgr-plugin',
      setup: () => ({
        icons: new Map(),
        optimization: true,
        typescript: true,
      }),
    };
  }

  async initialize() {
    return [await this.setupSvgr()];
  }
}
