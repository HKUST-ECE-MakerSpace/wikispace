self:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.wiki;
in
{
  options.services.wiki = with lib; {
    enable = mkEnableOption "wikispace (ECE Makerspace wiki)";

    package = mkOption {
      type = types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      description = "wikispace package to run";
    };

    port = mkOption {
      type = types.port;
      default = 3001;
      description = "Port the standalone Next.js server listens on";
    };

    stateDir = mkOption {
      type = types.path;
      default = "/var/lib/wiki";
      description = ''
        Persistent state: wiki content (MDX pages edited via /edit) and
        ops data (machines, reports, settings). Seeded from the package on
        first boot, owned by the service afterwards.
      '';
    };

    environment = mkOption {
      type = types.attrsOf types.str;
      default = { };
      description = ''
        Extra environment variables for the service — e.g. ADMIN_PASSWORD
        (used once, when data/settings.json is first seeded) or the Green
        API WhatsApp variables.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.wiki = {
      description = "wikispace — ECE Makerspace wiki";
      after = [ "network.target" ];
      wantedBy = [ "multi-user.target" ];

      environment = {
        PORT = toString cfg.port;
        WIKI_CONTENT_DIR = "${cfg.stateDir}/content/docs";
        WIKI_DATA_DIR = "${cfg.stateDir}/data";
      } // cfg.environment;

      preStart = ''
        mkdir -p ${cfg.stateDir}/content/docs ${cfg.stateDir}/data
        if [ -z "$(ls -A ${cfg.stateDir}/content/docs 2>/dev/null)" ]; then
          cp -R ${cfg.package}/share/wikispace/content/. ${cfg.stateDir}/content/
        fi
      '';

      serviceConfig = {
        DynamicUser = true;
        StateDirectory = "wiki";
        ExecStart = "${cfg.package}/bin/wikispace-server";
        Restart = "on-failure";
        RestartSec = "3";

        # hardening: everything read-only except the state dir
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictAddressFamilies = [
          "AF_INET"
          "AF_INET6"
          "AF_UNIX"
        ];
        RestrictNamespaces = true;
        LockPersonality = true;
        RestrictSUIDSGID = true;
        SystemCallArchitectures = "native";
      };
    };
  };
}
