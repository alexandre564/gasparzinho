{ pkgs, ... }: {
  channel = "stable-25.05";
  packages = [
    pkgs.nodejs
    pkgs.openssl
  ];
  env = {};
  idx = {
    extensions = [
      "Prisma.prisma"
    ];
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev"];
          manager = "web";
          env = { PORT = "3003"; };
        };
      };
    };
  };
}
