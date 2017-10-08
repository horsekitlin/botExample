const { auth, initializeApp } = require("firebase");
const _ = require("lodash");

initializeApp({
  apiKey: "AIzaSyD3kJkSLmkpSXtjbYGfyFvVG7xAwq7-poc",
  authDomain: "notificationwatcher.firebaseapp.com",
  databaseURL: "https://notificationwatcher.firebaseio.com",
  projectId: "notificationwatcher",
  storageBucket: "notificationwatcher.appspot.com",
  messagingSenderId: "431483268740"
});

const FirebaseAuth = auth();

async function Authorize(req, res, next) {
  const { authorization } = req.headers;
  try {
    const result = await FirebaseAuth.signInWithCustomToken(authorization);
    const user = _.pick(result, "uid", "displayName", "email", "phoneNumber");
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports.Authorize = Authorize;
