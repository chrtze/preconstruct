import { HELPERS } from "./constants";
import { lazyRequire } from "lazy-require.macro";
// @ts-ignore
import { addNamed } from "@babel/helper-module-imports";

function importHelperPlugin(babel: typeof import("@babel/core")) {
  return {
    pre(file: any) {
      const cachedHelpers: Record<string, babel.types.Identifier> = {};
      const previousHelperGenerator = file.get("helperGenerator");
      file.set("helperGenerator", (name: string) => {
        if (previousHelperGenerator) {
          const helperFromPrev = previousHelperGenerator(name);
          if (helperFromPrev != null) return helperFromPrev;
        }
        if (!file.availableHelper(name)) {
          return null;
        }

        if (cachedHelpers[name]) {
          return babel.types.identifier(cachedHelpers[name].name);
        }

        return (cachedHelpers[name] = addNamed(file.path, name, HELPERS));
      });
    },
  };
}

export async function transformBabel(
  code: string,
  cwd: string,
  filename: string
) {
  const babel = lazyRequire<typeof import("@babel/core")>();

  return babel
    .transformAsync(code, {
      caller: {
        name: "rollup-plugin-babel",
        supportsStaticESM: true,
        supportsDynamicImport: true,
      },
      sourceMaps: true,
      cwd,
      filename,
      plugins: [importHelperPlugin],
    })
    .then((res) => {
      let { code, map } = res!;
      return { code, map };
    });
}

export function transformTerser(code: string, optionsString: string) {
  const { minify } = lazyRequire<typeof import("terser")>();
  const options = JSON.parse(optionsString);
  return minify(code, options) as Promise<{ code: string; map: any }>;
}
