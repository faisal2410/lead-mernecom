const express = require("express");
const router = express.Router();
// middleware
const { requireSignin, isAdmin } = require("../middlewares/auth");
// controllers
const {
    register,
    login,
    logout,
    currentUser,
    forgotPassword,
    resetPassword,
    createUser,
    users,
    deleteUser,
    currentUserProfile,
    updateUserByAdmin,
    updateUserByUser
} = require("../controllers/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/current-subscriber", requireSignin, currentUser);
router.get("/current-admin", requireSignin, isAdmin, currentUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/create-user", requireSignin, isAdmin, createUser);
router.get("/users", requireSignin, isAdmin, users);
router.delete("/user/:userId", requireSignin, isAdmin, deleteUser);
router.get("/user/:userId", requireSignin, currentUserProfile);
router.put("/update-user-by-admin", requireSignin, isAdmin, updateUserByAdmin);
router.put("/update-user-by-user", requireSignin, updateUserByUser);
router.get("/", (req, res) => {
   
    res.status(200).json({
        message: "<========== Welcome to lead Mernecom ========>"
    })
})

module.exports = router;
