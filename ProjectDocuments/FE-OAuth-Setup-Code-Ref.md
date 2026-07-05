Frntend refernce:
const validationSchema = yup.object({
EmailAddress: yup
.string()
.email("Enter a valid email address")
.required("Email Address is required"),
});

type GoogleLoginProps = {
postGoogleLoginDetails: (data: any) => void;
responseToken: any;
setFetchingDetails: any;
};

const handleGoogleLogin = async ({
responseToken,
postGoogleLoginDetails,
setFetchingDetails,
}: GoogleLoginProps) => {
try {
setFetchingDetails(true);
const res = await axios.get(
"https://www.googleapis.com/oauth2/v2/userinfo",
{
headers: {
Authorization: `Bearer ${responseToken.access_token}`,
},
}
);
AuthStore.update((s) => {
s.signupEmailAddress = res.data.email;
s.userName = res.data.name;
});
const data = { token: responseToken.access_token };
setFetchingDetails(false);
postGoogleLoginDetails(data);
} catch (error) {
setFetchingDetails(false);
displayErrorMessage("Failed to retrieve user info from Google.");
}
};

const generateRandomString = (length = 16) => {
const array = new Uint8Array(length);
window.crypto.getRandomValues(array);
return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
""
);
};

const clientID = process.env.REACT_APP_GITHUB_CLIENT_ID;
const redirectURI = `${process.env.REACT_APP_GITHUB_REDIRECT_URL}/auth/github`;
const state = generateRandomString();

const loginWithGitHub = () => {
window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientID}&response_type=code&scope=repo&redirect_uri=${redirectURI}&state=${state}&scope=user:email`;
};

export default function LoginDetails() {
const navigate = useNavigate();
const { isLargeScreen, isMediumScreen, isSmallScreen } = useScreenSizes();

const [fetchingDetails, setFetchingDetails] = useState(false);

AuthStore.update((s) => {
s.signupEmailAddress = null;
});

const {
mutate: postGoogleLoginDetails,
isLoading: googleLoader,
isSuccess: isGoogleLoginSuccess,
} = useMutation(googleLogin, {
onSuccess: (res) => {
displaySuccessMessage(res.message);
if (res.isAccountVerified) {
Cookies.set("access_token", res.access_token);
Cookies.set("Sme", res?.sme);
// navigate("/app");
} else {
Cookies.set("refresh_Token", res.access_token);
navigate("/register");
displayErrorMessage("Please register into platform");
}
},
onError: (error) => {
displayErrorMessage("Google Login Failed");
navigate("/signup");
},
});

useEffect(() => {
if (isGoogleLoginSuccess) {
const checkSmeAndNavigate = () => {
const smeValue = Cookies.get("Sme");
if (smeValue !== undefined) {
if (smeValue === "true") {
navigate("/app/sme", { replace: true });
} else {
navigate("/app", { replace: true });
}
} else {
setTimeout(checkSmeAndNavigate, 100);
}
};

      checkSmeAndNavigate();
    }

}, [isGoogleLoginSuccess, navigate]);

const loginWithGoogle = useGoogleLogin({
onSuccess: (responseToken) => {
handleGoogleLogin({
responseToken,
postGoogleLoginDetails,
setFetchingDetails,
});
},
onError: () => {
displayErrorMessage("Google Login Failed");
},
});

const { mutate: GetOTP, isLoading: loginLoader } = useMutation(requestOtp, {
onSuccess: (res: any) => {
AuthStore.update((s) => {
s.signupEmailAddress = getValues("EmailAddress");
});
Cookies.set("refresh_Token", res.access_token);
navigate("/otp-verification");
displaySuccessMessage(res.message);
},
onError: (error) => {
displayErrorMessage(error);
navigate("/signup");
},
});

const { control, getValues, handleSubmit } = useForm({
resolver: yupResolver(validationSchema),
});

const onSubmit = (data: any) => {
GetOTP({
type: "LOGIN",
value: data.EmailAddress,
});
};

if (googleLoader || fetchingDetails) {
return (
<Box
sx={{
          justifyContent: "center",
          display: "flex",
          alignItems: "center",
        }} >
<Typography variant="subtitle2">Please Wait....</Typography>
<Lottie
animationData={orangeLoader}
loop={true}
autoplay={true}
style={{
            width: isLargeScreen ? "150px" : isMediumScreen ? "100px" : "70px",
            height: isLargeScreen ? "150px" : isMediumScreen ? "100px" : "70px",
          }}
/>
</Box>
);
}

return (
<Box
padding={5}
sx={{
        "@media (max-width: 1440px)": {
          padding: "20px 25px",
        },
        "@media (max-width: 1280px)": {
          padding: "20px 25px",
        },
        "@media (max-width: 960px)": {
          padding: "20px 25px",
        },
        "@media (max-width: 768px)": {
          padding: "20px 25px",
        },
        "@media (max-width: 480px)": {
          padding: "20px 25px",
        },
      }} >
<img
src={Icons.namedLogo}
alt="loading..."
width={isLargeScreen ? "60%" : "47%"}
/>
<Stack
my={"3vh"}
sx={{
          "@media (max-width: 1440px)": {
            my: "1vh",
          },
          "@media (max-width: 1280px)": {
            my: "1vh",
          },
          "@media (max-width: 960px)": {
            my: "1vh",
          },
          "@media (max-width: 768px)": {
            my: "1vh",
          },
          "@media (max-width: 480px)": {
            my: "1vh",
          },
        }} >
<Typography variant="h3">Welcome back!</Typography>
<Typography variant="subtitle2">
Log in to continue using your account.
</Typography>
</Stack>

      <TextField
        formateType={Formate.EmailAddress}
        control={control}
        name="EmailAddress"
        label="Email Address"
        required
        placeholder="Enter your email address"
        height={
          isLargeScreen
            ? "42px"
            : isMediumScreen
            ? "40px"
            : isSmallScreen
            ? "35px"
            : "30px"
        }
      />

      <Stack
        gap={"1vh"}
        marginTop={"1vh"}
        sx={{
          "@media (max-width: 1440px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 1280px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 960px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 768px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 480px)": {
            marginTop: "1vh",
          },
        }}
      >
        <MultiTypeButton
          buttonType={ButtonType.Gradient}
          actionOnClick={handleSubmit(onSubmit)}
          typeText="Login"
          isLoading={loginLoader}
          key={"log-in"}
          height={
            isLargeScreen
              ? "42px"
              : isMediumScreen
              ? "40px"
              : isSmallScreen
              ? "35px"
              : "30px"
          }
        />

        <MultiTypeButton
          buttonType={ButtonType.Google}
          actionOnClick={loginWithGoogle}
          typeText="Login with Google"
          icon={Icons.googleLogo}
          key={"log-in-google"}
          height={
            isLargeScreen
              ? "42px"
              : isMediumScreen
              ? "40px"
              : isSmallScreen
              ? "35px"
              : "30px"
          }
        />

        <MultiTypeButton
          buttonType={ButtonType.GitHub}
          actionOnClick={() => {
            loginWithGitHub();
          }}
          typeText="Login with Github"
          icon={Icons.githubLogo}
          key={"log-in-github"}
          height={
            isLargeScreen
              ? "42px"
              : isMediumScreen
              ? "40px"
              : isSmallScreen
              ? "35px"
              : "30px"
          }
        />
      </Stack>

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "center",
          marginTop: "2vh",
          "@media (max-width: 1440px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 1280px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 960px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 768px)": {
            marginTop: "1vh",
          },
          "@media (max-width: 480px)": {
            marginTop: "1vh",
          },
        }}
      >
        <Typography variant="subtitle2">New User?</Typography>
        <Button
          variant="text"
          onClick={() => {
            navigate("/signup");
          }}
        >
          <Typography
            variant="subtitle2"
            color={ColorPalette.BrandColors.OrangeLight}
            fontWeight="bold"
          >
            Sign Up
          </Typography>
        </Button>
      </Stack>
    </Box>

);
}

export const googleLogin = async (body: any) => {
try {
const response = await http.post("/auth/google", body);
return response.data;
} catch (error) {
throw error;
}
};
this is authServie i mena api calls somehting:

---

Also in backend auth/google service is
async googleLogin(body: GLoginDto) {
try {
const { token } = body;

      const response = await axios
        .get(process.env.GOOGLE_API, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          return res?.data;
        })
        .catch((err) => console.log(err));

      let user = await this.userModel
        .findOne({ emailAddress: response?.email })
        .exec();

      console.log('user', user);

      const sme = await this.roleModel.findOne({ name: RoleType.SME }).exec();

      if (!user) {
        const role = await this.roleModel
          .findOne({ name: RoleType.ADMIN })
          .exec();
        if (!role) {
          throw new BadRequestException('Role Not Found');
        }

        user = new this.userModel({
          isEmailVerified: true,
          isAccountVerified: false,
          roleId: role._id,
          emailAddress: response?.email,
        });
        await user.save();
        return {
          access_token: this.jwtService.sign({
            id: user._id,
            userId: user._id,
          }),
          isAccountVerified: user.isAccountVerified,
        };
      }

      return {
        access_token: this.jwtService.sign({
          id: user._id,
          userId: user._id,
        }),
        sme: user?.roleId.toString() == sme?._id.toString(),
        isAccountVerified: user.isAccountVerified,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(error.message, error.status);
    }

export class GLoginDto {
@IsNotEmpty()
@IsString()
token: string;
}
}

Example env you can use is in BE:# GOOGLE_LOGIN
GOOGLE_API=https://www.googleapis.com/oauth2/v2/userinfo
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

FE:same
