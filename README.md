# oauth.websample.azure

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/8e9d0ae46ea64c479dd4d9fbdd6ff769)](https://www.codacy.com/gh/gary-archer/oauth.websample.azure/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gary-archer/oauth.websample.azure&amp;utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.websample.azure/badge.svg?targetFile=spa/package.json)](https://snyk.io/test/github/gary-archer/oauth.websample.azure?targetFile=spa/package.json)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.websample.azure/badge.svg?targetFile=api/package.json)](https://snyk.io/test/github/gary-archer/oauth.websample.azure?targetFile=api/package.json)

### Overview

* An SPA sample using OAuth and Open Id Connect, referenced in my blog at https://authguidance.com
* **The goal of this sample is to show how to integrate our standards based API and SPA with Azure AD 2.0**

### Details

* See the [Azure Overview](https://authguidance.com/2017/11/30/azure-active-directory-setup/) for a summary of behaviour and initial setup
* See the [Azure SPA Troubleshooting](https://authguidance.com/2017/12/01/azure-ad-spa-code-sample/) page to understand how to complete the setup

### Programming Languages

* TypeScript is used for the SPA
* NodeJS with TypeScript is used for the API

### Middleware Used

* Express is used to host both the API and the SPA's web static content
* Azure Active Directory 2.0 Endpoints are used for the Authorization Server
* The [Oidc-Client Library](https://github.com/IdentityModel/oidc-client-js) is used to implement the Authorization Code Flow (PKCE) in the SPA
* The [OpenId-Client Library](https://github.com/panva/node-openid-client) is used to handle API interaction with the Authorization Server
* The [Jsonwebtoken Library](https://github.com/auth0/node-jsonwebtoken) is used by the API to do in memory validation of Azure AD access tokens
* The [Node Cache](https://github.com/mpneuried/nodecache) is used to cache API claims keyed against tokens

### SSL Certificates

* Certificates in the certs folder originate from the [OAuth Development Certificates](https://github.com/gary-archer/oauth.developmentcertificates) repository
