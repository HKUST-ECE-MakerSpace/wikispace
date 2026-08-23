{
  lib,
  stdenv,
  bun,
  nodejs,
  cacert,
  autoPatchelfHook,
  makeWrapper,
}:

let
  # node_modules differ per platform (bun fetches per-OS optional deps),
  # so each platform pins its own FOD hash.
  depsHash =
    if stdenv.isDarwin then
      "sha256-ssAam8s9mcwn4z9FSk27uxLHIeL8TE5NIZEx4ZBwiRo="
    else
      "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  # Everything the build needs — no VCS, no dev scratch, no runtime state.
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
        ".next"
        "data"
        "node_modules"
        "webtest2"
      ];
  };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "wikispace";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

  src = appSource;

  # node_modules fetched by bun against the lockfile (fixed-output, cached).
  deps = stdenv.mkDerivation {
    pname = "wikispace-node-deps";
    inherit (finalAttrs) version;

    src = appSource;

    buildInputs = [
      bun
      cacert
    ];

    buildPhase = ''
      export HOME=$TMPDIR
      export BUN_INSTALL_CACHE_DIR=$TMPDIR/bun-cache
      bun install --frozen-lockfile
      # caches/journals make the output non-deterministic
      rm -rf node_modules/.cache node_modules/.bun
    '';

    installPhase = ''
      mkdir -p $out
      cp -R node_modules $out/node_modules
    '';

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = depsHash;
  };
  nativeBuildInputs = [
    nodejs
    makeWrapper
  ]
  # patches native ELF binaries (build-time turbopack/oxide, runtime swc)
  # in node_modules and in $out — linux only, darwin Mach-O needs nothing
  ++ lib.optionals stdenv.isLinux [ autoPatchelfHook ];
  buildInputs = [ stdenv.cc.cc.lib ];

  buildPhase = ''
    runHook preBuild
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    export NEXT_OUTPUT_STANDALONE=1

    cp -R ${finalAttrs.deps}/node_modules ./node_modules
    chmod -R u+w node_modules
    # turbopack/oxide/lightningcss ship native binaries that must be patched
    # before `next build` can execute them (linux only — darwin Mach-O runs
    # unpatched)
    ${lib.optionalString stdenv.isLinux "autoPatchelf node_modules"}

    node node_modules/next/dist/bin/next build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    app=$out/share/wikispace
    mkdir -p $app
    # relocatable standalone server (server.js + traced node_modules)
    cp -R .next/standalone/. $app/
    # static assets are not part of the standalone trace
    cp -R .next/static $app/.next/static
    # seed content for the first boot; the web editor writes to
    # WIKI_CONTENT_DIR afterwards, this copy is never touched again
    cp -R content $app/content

    mkdir -p $out/bin
    makeWrapper ${nodejs}/bin/node $out/bin/wikispace-server \
      --set NODE_ENV production \
      --add-flags "$app/server.js"

    runHook postInstall
  '';

  passthru.appDir = "/share/wikispace";

  meta = {
    description = "ECE Makerspace wiki — browser-editable MDX docs + live ops";
    homepage = "https://wiki.ecemaker.space";
    license = lib.licenses.mit;
    mainProgram = "wikispace-server";
  };
})
