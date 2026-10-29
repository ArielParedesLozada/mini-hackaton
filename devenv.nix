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
  ];
}
