{
  description = "wikispace — ECE Makerspace wiki (Next.js docs + live ops)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        wikispace = pkgs.callPackage ./package.nix { };
        default = wikispace;
      });

      nixosModules.default = import ./nixos-module.nix self;
    };
}
