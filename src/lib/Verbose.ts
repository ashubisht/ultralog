export class Verbose {
  public enabled: boolean = false;

  public print(): string {
    return this.enabled ? this.harshPrint() : "";
  }

  public harshPrint(): string {
    return `GID: ${this.gid()}, UID: ${this.uid()}, PID: ${this.pid()}, MEMORY: { ${this.memory()} }`;
  }

  /**
   * Structured representation of verbose info. Prefer this over parsing the string.
   */
  public toObject() {
    const memInfo = process.memoryUsage();
    return {
      gid: this.gid(),
      uid: this.uid(),
      pid: this.pid(),
      memory: {
        arrayBuffers: memInfo.arrayBuffers,
        external: memInfo.external,
        heapTotal: memInfo.heapTotal,
        heapUsed: memInfo.heapUsed,
        rss: memInfo.rss,
      },
    };
  }

  private gid(): number {
    // process.getgid may not exist on non-POSIX platforms
    // keep runtime check to avoid exceptions
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof process.getgid === "function" ? process.getgid() : 0;
  }

  private uid(): number {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof process.getuid === "function" ? process.getuid() : 0;
  }

  private pid(): number {
    return process.pid;
  }

  private memory(): string {
    const memInfo = process.memoryUsage();
    return `ArrayBuffer: ${memInfo.arrayBuffers}, External: ${memInfo.external}, HeapTotal: ${memInfo.heapTotal}, HeapUsed: ${memInfo.heapUsed}, RSS: ${memInfo.rss}`;
  }
}
