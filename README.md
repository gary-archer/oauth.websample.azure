# authguidance.websample.azure

### Overview

* An SPA sample using OAuth 2.0 and Open Id Connect, referenced in my blog at https://authguidance.com
* **The goal of this sample is to show how to integrate our standards based API and SPA with Azure AD 2.0**

### Details

* See the [Azure Setup Page](https://authguidance.com/2017/11/30/azure-active-directory-setup/) for how to configure Windows Azure
* See the [Azure Code Sample Page](https://authguidance.com/2017/11/30/azure-active-directory-setup/) for how to run the sample and differences to OAuth behaviour

### Programming Languages

* TypeScript is used for the SPA
* NodeJS with TypeScript is used for the API

### Middleware Used

* The [Oidc-Client Library](https://github.com/IdentityModel/oidc-client-js) is used to implement the Implicit Flow
* The [OpenId-Client Library](https://github.com/panva/node-openid-client) is used to handle API interaction with the Authorization Server
* The [Jsonwebtoken Library](https://github.com/auth0/node-jsonwebtoken) is used by the API to do in memory validation of access tokens
* The [Node Cache](https://github.com/mpneuried/nodecache) is used to cache API claims keyed against tokens
* Express is used to host both the API and the SPA content
* Azure Active Directory 2.0 Endpoints are used for the Authorization Server
* OpenSSL is used for SSL certificate handling
