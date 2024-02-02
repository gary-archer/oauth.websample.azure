# OAuth Azure AD SPA and API Code Sample

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/87203e565f6d4ded9299896cdd741cc1)](https://app.codacy.com/gh/gary-archer/oauth.websample.azure?utm_source=github.com&utm_medium=referral&utm_content=gary-archer/oauth.websample.azure&utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.websample.azure/badge.svg?targetFile=spa/package.json)](https://snyk.io/test/github/gary-archer/oauth.websample.azure?targetFile=spa/package.json)
[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.websample.azure/badge.svg?targetFile=api/package.json)](https://snyk.io/test/github/gary-archer/oauth.websample.azure?targetFile=api/package.json)

## Overview

A sample focused on intergating with Azure Active Directory using a standards based approach:

- The SPA uses the traditional OpenID connect flow, with session management features
- The API authorizes access to data using claims from multiple data sources

## Views

The SPA is a simple UI with some basic navigation between views, to render fictional resources.\
The data is returned from an API that authorizes using claims from multiple sources.

![SPA Views](./doc/views.png)

## Prerequisites

See the [Azure Overview](https://authguidance.com/2017/11/30/azure-active-directory-setup/) for details on the initial setup and SPA + API registration.\
Then update the settings in these files to point to your own Azure AD instance and application instances:

- spa/spa.config.json
- api/api.config.json

## Local Development Quick Start

Ensure that Node.js is installed, then run the build script:

```bash
./build.sh
```

Custom development domains are used so you must add these entries to your hosts file:

```
127.0.0.1 localhost web.mycompany.com api.mycompany.com
```

Next configure [Browser SSL Trust](https://authguidance.com/2017/11/11/developer-ssl-setup#browser) for the SSL root certificate:

```
./api/certs/localhost/mycompany.com.ca.pem
```

Then run the following script to run the code for both SPA and API:

```bash
./run.sh
```

A browser will then be invoked, after which you can sign in with your own Azure AD test user accounts.

## Further Information

* See the [Azure SPA Troubleshooting](https://authguidance.com/2017/12/01/azure-ad-spa-code-sample/) page to understand some vendor specific behaviour

## ![Red icon](https://via.placeholder.com/15/f03c15/f03c15.png) 2021 Security Update

- In 2021 it is instead recommended to keep tokens out of the browser, using a Backend for Frontend
- See the [Final SPA Code Sample](https://github.com/gary-archer/oauth.websample.final) for an API driven implementation

## Programming Languages

* Plain TypeScript is used for the SPA, to explain OAuth behaviour in the simplest way
* Node.js and TypeScript are used to implement the API

## Infrastructure

* Express is used to host both the API and the SPA content
* Azure Active Directory is used as the default Authorization Server
* The [oidc-client-ts](https://github.com/authts/oidc-client-ts) library is used by the SPA to implement OpenID Connect
* The [jose](https://github.com/panva/jose) library is used by the API to validate JWT access tokens
* The [node-cache](https://github.com/mpneuried/nodecache) library is used to cache extra claims, when access tokens are first received
