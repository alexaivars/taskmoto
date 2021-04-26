#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OUT=$DIR/certs
# # remove any existing directories and certificates
rm -rf $OUT

# make directories to work from
mkdir -p $OUT

# Create Self-signed Root Certificate Authority
echo "Generating development certificates"
openssl req \
  -x509 \
  -nodes \
  -new \
  -sha256 \
  -days 712 \
  -newkey rsa:2048 \
  -keyout $OUT/RootCA.key \
  -out $OUT/RootCA.pem \
  -subj "/C=SE/O=Developer Dev/CN=Localhost Project CA"


openssl x509 \
  -outform pem \
  -in $OUT/RootCA.pem \
  -out $OUT/RootCA.crt

# Create a Device Certificate

openssl req \
  -new \
  -nodes \
  -newkey rsa:2048 \
  -keyout $OUT/localhost.key \
  -out $OUT/localhost.csr \
  -subj "/C=SE/ST=Stockholm/L=Stockholm/O=Localhost Project Dev/CN=localhost"

openssl x509 \
  -req \
  -sha256 \
  -days 712 \
  -in $OUT/localhost.csr \
  -CA $OUT/RootCA.pem \
  -CAkey $OUT/RootCA.key \
  -CAcreateserial \
  -extfile $DIR/domains.ext \
  -out $OUT/localhost.crt

# remove any old Root certifactes from user keychain
sudo security delete-certificate \
  -c "Localhost Project CA" \
  $HOME/Library/Keychains/login.keychain-db \
  >/dev/null

# add Root certifactes from to keychain and trust
sudo security \
  add-trusted-cert \
  -d \
  -r trustRoot \
  -p IPSec \
  -p basic \
  -p codeSign \
  -p eap \
  -p pkgSign \
  -p smime \
  -p timestamping \
  -p ssl \
  -p swUpdate \
  -e hostnameMismatch \
  -k $HOME/Library/Keychains/login.keychain-db $OUT/RootCA.crt


# Create a JWT keys
openssl genrsa \
  -out $OUT/jwtAccessTokenSecret.pem \
  4096 \

openssl rsa \
  -in $OUT/jwtAccessTokenSecret.pem \
  -pubout \
  -out $OUT/jwtAccessTokenPublic.pem 
CHECK='\033[0;32m\xE2\x9C\x94\033[0m'
for package in packages/*; do
echo package
    if [ -d "$package" ]; then
        # Will not run if no directories are available
        echo -e "Running setup for $package:"
        ENV_FILE=$DIR/../$package/.env
        if [[ -f "$FILE" ]]; then
          # sed -r  -i '' '/SSL_PRIVATE_KEY/,/END PRIVATE KEY/d' $ENV_FILE
          # sed -r  -i '' '/SSL_CERTIFICATE/,/END CERTIFICATE/d' $ENV_FILE
          sed -i '' '/^SSL_PRIVATE_KEY/d' $ENV_FILE
          sed -i '' '/^SSL_CERTIFICATE/d' $ENV_FILE
          sed -i '' '/^JWT_ACCESS_TOKEN_SECRET/d' $ENV_FILE
          sed -i '' '/^JWT_ACCESS_TOKEN_PUBLIC/d' $ENV_FILE
          sed -i '' '/^NODE_EXTRA_CA_CERTS/d' $ENV_FILE
          echo -e "$CHECK SSL_PRIVATE_KEY updated in .env file"
          echo -e "$CHECK SSL_CERTIFICATE updated in .env file"
          echo -e "$CHECK JWT_ACCESS_TOKEN_SECRET updated in .env file"
          echo -e "$CHECK JWT_ACCESS_TOKEN_PUBLIC updated in .env file"
        else
          echo -e "$CHECK SSL_PRIVATE_KEY added in .env file"
          echo -e "$CHECK SSL_CERTIFICATE added in .env file"
          echo -e "$CHECK JWT_ACCESS_TOKEN_SECRET updated in .env file"
          echo -e "$CHECK JWT_ACCESS_TOKEN_PUBLIC updated in .env file"
        fi

        echo "NODE_EXTRA_CA_CERTS=$OUT/RootCA.pem" >> $ENV_FILE
        echo "SSL_PRIVATE_KEY=\"`sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\n/g' $OUT/localhost.key`\"" >> $ENV_FILE
        echo "SSL_CERTIFICATE=\"`sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\n/g' $OUT/localhost.crt`\"" >> $ENV_FILE
        echo "JWT_ACCESS_TOKEN_SECRET=\"`sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\n/g' $OUT/jwtAccessTokenSecret.pem`\"" >> $ENV_FILE
        echo "JWT_ACCESS_TOKEN_PUBLIC=\"`sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\n/g' $OUT/jwtAccessTokenPublic.pem`\"" >> $ENV_FILE
    fi
done
