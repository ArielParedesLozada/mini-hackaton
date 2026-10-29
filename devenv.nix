
{
  pkgs,
  lib,
  config,
  inputs,
  ...
}: {
  env = {
    name = "minit-hackaton";
  };

  packages = with pkgs; [
    code-cursor
    git
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    npm.enable = true;
  };
}
