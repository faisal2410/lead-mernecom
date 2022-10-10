// const admin = require("../firebase");
const User = require("../models/user");
const { expressjwt } = require("express-jwt");

exports.requireSignin = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

exports.isAdmin = async (req, res, next) => {
  console.log(req.auth)
  try {
    const user = await User.findById(req.auth._id);
    if (user.role !== "admin") {
      return res.status(403).json({
        status: "Fail",
        message: "Unauthorized.Admin resource"
      });
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
};



exports.authCheck = async (req, res, next) => {
  // console.log(req.headers.authtoken); // token
  try {
    const firebaseUser = await admin
      .auth()
      .verifyIdToken(req.headers.authtoken);
    // console.log("FIREBASE USER IN AUTHCHECK", firebaseUser);
    req.user = firebaseUser;
    next();
  } catch (err) {
    // console.log(err);
    res.status(401).json({
      err: "Invalid or expired token",
    });
  }
};

exports.adminCheck = async (req, res, next) => {
  const { email } = req.user;

  const adminUser = await User.findOne({ email }).exec();

  if (adminUser.role !== "admin") {
    res.status(403).json({
      err: "Admin resource. Access denied.",
    });
  } else {
    next();
  }
};
