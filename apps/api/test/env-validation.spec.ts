describe("Environment validation", () => {
  it("refuse de demarrer si DATABASE_URL est absente", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    let compilePromise: Promise<unknown>;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppModule } = require("../src/app.module");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Test } = require("@nestjs/testing");
      compilePromise = Test.createTestingModule({ imports: [AppModule] }).compile();
    });

    await expect(compilePromise!).rejects.toThrow(/DATABASE_URL/);

    process.env.DATABASE_URL = original;
  });
});
