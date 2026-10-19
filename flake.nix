{
  description = "w-flow dev environment (Node.js + pnpm)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSystem = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSystem (pkgs: {
        default = pkgs.mkShellNoCC {
          packages = with pkgs; [
            nodejs_24
            pnpm
            git
          ];

          shellHook = ''
            export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
            # pnpm 全局安装目录放到项目内，避免污染 $HOME
            export PNPM_HOME="$PWD/.nix-pnpm"
            export PATH="$PNPM_HOME:$PATH"
            mkdir -p "$PNPM_HOME"
            echo "node $(node --version) | pnpm $(pnpm --version)"
          '';
        };
      });
    };
}
