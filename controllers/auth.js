const { signupService, findUserByEmail, findUserById, forgotPassword, resetPassword } = require("../services/auth");
const { generateToken, hashPassword, comparePassword } = require("../helpers/auth");
const User = require("../models/user");
const nanoid = require("nanoid");
const validator = require("validator");

// sendgrid
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_KEY);


exports.register = async (req, res) => {
  try {
    const user = await signupService(req.body);

    const token = user.generateConfirmationToken();

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: "Successfully signed up",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        status: "fail",
        error: "Please provide your credentials",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        error: "No user found. Please create an account",
      });
    }

    const isPasswordValid = user.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(403).json({
        status: "fail",
        error: "Password is not correct",
      });
    }

   

    const token = generateToken(user);

    // const { password: pwd, ...others } = user.toObject();
    // return user and token to client, exclude hashed password
    user.password = undefined;
    user.confirmPassword = undefined;
    // send token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      // secure: true, // only works on https
    });

    // send user as json response

    res.status(200).json({
      status: "success",
      message: "Successfully logged in",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      error: error.message,
    });
  }
};


exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({
      status: "success",
      message: "Signout success"
    });
  } catch (err) {
    res.status(400).json({
      status: "Fail",
      message: err.message
    })
  }
};

exports.currentUser = async (req, res) => {
  try {
    const user = await findUserById(req.auth._id)
    // console.log("CURRENT_USER", user);
    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  // find user by email
  const user = await User.findOne({ email });
  console.log("USER ===> ", user);
  if (!user) {
    return res.json({ error: "User not found" });
  }
  // generate code
  const resetCode = nanoid(5).toUpperCase();
  // const resetCode = nanoid();
  // save to db
  user.resetCode = resetCode;
  user.save({ validateBeforeSave: false });
  // prepare email
  const emailData = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Password reset code",
    html: `<h1>Your password  reset code is: ${resetCode}</h1>`,
  };
  // send email
  try {
    const data = await sgMail.send(emailData);
    console.log(data);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.json({ ok: false });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, password, resetCode } = req.body;
    // find user based on email and resetCode
    const user = await User.findOne({ email, resetCode });
    // if user not found
    if (!user) {
      return res.json({ error: "Email or reset code is invalid" });
    }
    // if password is short
    // if (!password || password.length < 6) {
    //   return res.json({
    //     error: "Password is required and should be 6 characters long",
    //   });
    // }
    // // hash password
    // const hashedPassword = await hashPassword(password);
    // user.password = hashedPassword;
    user.resetCode = "";
    user.save({ validateBeforeSave: false });
    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};


exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    // if user exist
    const exist = await User.findOne({ email });
    if (exist) {
      return res.json({ error: "Email is taken" });
    }
    const user = await new User({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      
      
    }).save();
    return res.status(200).json(user);

  } catch (err) {
    res.status(400).json({
      status: "Fail",
      message: err.message
    })
  }
};

exports.users = async (req, res) => {
  try {
    const all = await User.find().select("-password -confirmPassword -resetCode");
    res.json(all);
  } catch (err) {
    console.log(err);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.auth._id) return;
    const user = await User.findByIdAndDelete(userId);
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

exports.currentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("image");
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

exports.updateUserByAdmin = async (req, res) => {
  try {
    const { id, firstName, lastName, email, password, confirmPassword,role} = req.body;

    const userFromDb = await User.findById(id);
    console.log("============>",userFromDb)
    // check valid email
    if (!validator.isEmail(email)) {
      return res.json({ error: "Invalid email" });
    }
    // check if email is taken
    const exist = await User.findOne({ email });
    if (exist && exist._id.toString() !== userFromDb._id.toString()) {
      return res.json({ error: "Email is taken" });
    }
    // check password strength

    if (!validator.isStrongPassword(password, {
      minLength: 6,
      minLowercase: 3,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 1,
    })) {
      return res.json({
        error: "Password is not strong enough.",
      });
    }
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const hashedConfirmPassword = confirmPassword ? await hashPassword(confirmPassword) : undefined
    const updated = await User.findByIdAndUpdate(
      id,
      {
        firstName: firstName || userFromDb.firstName,
        lastName: lastName || userFromDb.lastName,
        email: email || userFromDb.email,
        password: hashedPassword || userFromDb.password,
        confirmPassword: hashedConfirmPassword || userFromDb.confirmPassword,      
        role: role || userFromDb.role,
       
      },
      { new: true }
    )

    res.json(updated);
  } catch (err) {
    console.log(err);
  }
};

exports.updateUserByUser = async (req, res) => {
  try {
    const { id, firstName, lastName, email, password, confirmPassword } = req.body;

    const userFromDb = await User.findById(id);

    // check if user is himself/herself
    if (userFromDb._id.toString() !== req.auth._id.toString()) {
      return res.status(403).send("You are not allowed to update this user");
    }

    // check valid email
    if (!validator.isEmail(email)) {
      return res.json({ error: "Invalid email" });
    }
    // check if email is taken
    const exist = await User.findOne({ email });
    if (exist && exist._id.toString() !== userFromDb._id.toString()) {
      return res.json({ error: "Email is taken" });
    }
    // check password length
    if (!validator.isStrongPassword(password, {
      minLength: 6,
      minLowercase: 3,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 1,
    })) {
      return res.json({
        error: "Password is not strong enough.",
      });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;
    const hashedConfirmPassword = confirmPassword ? await hashPassword(confirmPassword) : undefined
    const updated = await User.findByIdAndUpdate(
      id,
      {
        firstName: firstName || userFromDb.firstName,
        lastName: lastName || userFromDb.lastName,
        email: email || userFromDb.email,
        password: hashedPassword || userFromDb.password,
        confirmPassword: hashedConfirmPassword || userFromDb.confirmPassword,
      },
      { new: true }
    )

    res.json(updated);
  } catch (err) {
    console.log(err);
  }
};