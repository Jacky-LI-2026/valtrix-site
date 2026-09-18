// ssh2 类型声明（ssh2 包未内置 .d.ts，这里提供 minimal 类型）
declare module "ssh2" {
  export class Client {
    on(event: string, listener: (...args: any[]) => void): this;
    exec(command: string, callback?: (err: Error | null, stream: any) => void): void;
    connect(config: any): void;
    end(): void;
    sftp(callback?: (err: Error | null, sftp: any) => void): void;
  }
  export class Server {
    on(event: string, listener: (...args: any[]) => void): this;
    listen(...args: any[]): void;
  }
  export class ServerConfig {}
}
