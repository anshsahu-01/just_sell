import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { signToken } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { LoginInput, RegisterInput } from "./auth.validation";

const SALT_ROUNDS = 10;

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  profileImage: true,
  collegeName: true,
  isVerified: true,
  role: true,
  createdAt: true,
} as const;

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
}

export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      password: hashedPassword,
      profileImage: input.profileImage,
      collegeName: input.collegeName,
    },
    select: publicUserSelect,
  });

  return user;
}

export async function login(input: LoginInput) {
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken({ userId: user.id, role: user.role });

  const { password: _password, ...publicUser } = user;

  return {
    user: publicUser,
    token,
  };
}
