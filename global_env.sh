for pkg in packages/*; do
  if [ -d "$pkg" ]; then
    ln -sf ../../.env "$pkg/.env"
    if [ -L "$pkg/.env" ]; then
      echo "$pkg/.env -> $(readlink -f "$pkg/.env")"
    else
      echo "$pkg/.env symlink not created!"
    fi
  fi
done