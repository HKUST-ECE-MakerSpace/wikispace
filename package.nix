{
  lib,
  stdenv,
  nodejs,
  cacert,
  autoPatchelfHook,
  makeWrapper,
}:

let
  # The app is built inside a fixed-output derivation: FODs may use the
  # network, so npm installs and `next build` runs there directly — no
  # cache-tarball dance. The output hash pins the result per platform
  # (node_modules differ: per-OS optional deps like @next/swc-*).
  appHash =
    if stdenv.isDarwin then
      "sha256-VwKqLwlNIbTcj91I8e7Q9IC6nKG2jPY1/FpAZIbfRag="
    else
      "sha256-gopbYoi3bVCFV1taVr+cVidxCh95O9h8tm5LYayEf48=";

  # Everything the build needs — no VCS, no dev scratch, no runtime state,
  # and no doc-only files (README/LICENSE edits don't shift the build hash).
  appSource = lib.cleanSourceWith {
    src = ./.;
    filter =
      path: type:
      let
        rel = lib.removePrefix (toString ./.) (toString path);
        top = builtins.head (lib.splitString "/" rel);
      in
      !builtins.elem top [
        ".git"
        ".env"
        ".env.local"
        ".github"
        ".next"
        "LICENSE"
        "README.md"
        "data"
        "node_modules"
        "webtest2"
      ];
  };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "wikispace";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

  app = stdenv.mkDerivation {
    pname = "wikispace-app";
    inherit (finalAttrs) version;
    src = appSource;

    buildInputs = [
      nodejs
      cacert
    ];

    # npm rather than bun: bun's prebuilt x86_64 binaries require AVX2,
    # which the Ivy Bridge Xeon serving wiki.ecemaker.space lacks.
    # --ignore-scripts is safe: all native deps (swc, oxide, lightningcss)
    # ship their binaries in platform optionalDependencies.
    buildPhase = ''
      export HOME=$TMPDIR
      export npm_config_cache=$TMPDIR/npm-cache
      ${nodejs}/bin/npm ci --ignore-scripts --no-audit --no-fund
      # sharp's prebuilt linux binaries need AVX2, which the Ivy Bridge
      # Xeon serving wiki.ecemaker.space lacks — merely require()ing sharp
      # segfaults the whole Node process there. @vercel/og (OG images)
      # falls back to its bundled resvg.wasm when sharp is unimportable,
      # so drop it before the build: the standalone trace then ships
      # without it and OG renders via wasm everywhere.
      rm -rf node_modules/sharp node_modules/@img
      export NODE_ENV=production
      export NEXT_TELEMETRY_DISABLED=1
      export NEXT_OUTPUT_STANDALONE=1
      node node_modules/next/dist/bin/next build
    '';

    installPhase = ''
      app=$out/share/wikispace
      mkdir -p $app
      # relocatable standalone server (server.js + traced node_modules)
      cp -R .next/standalone/. $app/
      # static assets are not part of the standalone trace
      cp -R .next/static $app/.next/static
      # seed content for the first boot; the web editor writes to
      # WIKI_CONTENT_DIR afterwards, this copy is never touched again
      cp -R content $app/content
    '';

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = appHash;
  };

  dontUnpack = true;

  nativeBuildInputs = [
    nodejs
    makeWrapper
  ]
  # patches native ELF binaries (runtime swc etc.) in $out — linux only,
  # darwin Mach-O needs nothing
  ++ lib.optionals stdenv.isLinux [ autoPatchelfHook ];
  buildInputs = [ stdenv.cc.cc.lib ];

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share
    cp -R ${finalAttrs.app}/share/wikispace $out/share/wikispace
    mkdir -p $out/bin
    makeWrapper ${nodejs}/bin/node $out/bin/wikispace-server \
      --set NODE_ENV production \
      --add-flags "$out/share/wikispace/server.js"
    runHook postInstall
  '';

  meta = {
    description = "ECE Makerspace wiki — browser-editable MDX docs + live ops";
    homepage = "https://wiki.ecemaker.space";
    license = lib.licenses.mit;
    mainProgram = "wikispace-server";
  };
})
