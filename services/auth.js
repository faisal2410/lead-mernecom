const User = require("../models/user");


exports.signupService = async (userInfo) => {
    const user = await User.create(userInfo);
    return user;
};

exports.findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

exports.findUserByToken = async (token) => {
    return await User.findOne({ confirmationToken: token });
};

exports.findUserById = async (id) => {
    const user = await User.findById(id).select("-password").exec();
    return user;
}
exports.findUserByRole = async (role) => {
    const user = await User.findOne(role).select("-password -confirmPassword").exec();;
    return user
}


exports.forgotPassword = async (email, shortCode) => {
    const user = await User.findOneAndUpdate(
        { email },
        { passwordResetToken: shortCode }
    );
    return user;
}

exports.resetPassword = async (email, code, newPassword) => {
    const user = User.findOneAndUpdate(
        {
            email,
            passwordResetToken: code,
        },
        {
            password: newPassword,
            passwordResetToken: "",
        }
    ).exec();
    return user;
}