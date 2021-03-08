"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@apollo/client");
require("../styles/globals.css");
var apolloClient_1 = __importDefault(require("../apolloClient"));
function MyApp(_a) {
    var Component = _a.Component, pageProps = _a.pageProps;
    var apolloClient = apolloClient_1.default(pageProps.initialApolloState);
    return (<client_1.ApolloProvider client={apolloClient}>
      <Component {...pageProps}/>
    </client_1.ApolloProvider>);
}
exports.default = MyApp;
