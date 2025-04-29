const checkEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        return { valid: false, message: "이메일을 입력해주세요." };
    }
    if (!emailRegex.test(email)) {
        return { valid: false, message: "이메일 형식이 올바르지 않습니다." };
    }
    return { valid: true };
}

export default checkEmail