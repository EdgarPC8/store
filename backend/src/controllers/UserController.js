import bcrypt from "bcrypt";
import { Users } from "../models/Users.js";
import { Account } from "../models/Account.js";
import { Roles } from "../models/Roles.js";
import { UserData } from "../models/UserData.js";
import { sequelize } from "../database/connection.js";
import { UniqueConstraintError } from "sequelize";

const USER_FIELDS = new Set([
  "ci",
  "documentType",
  "firstName",
  "secondName",
  "firstLastName",
  "secondLastName",
  "birthday",
  "gender",
]);

function pickUserFields(body) {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => USER_FIELDS.has(key))
  );
}

async function hashAccountPassword(password) {
  const plain = password?.trim() ? password : "12345678";
  return bcrypt.hash(plain, 10);
}

async function upsertAccountForUser(userId, { username, password, roles }, transaction) {
  let account = await Account.findOne({ where: { userId }, transaction });

  if (username?.trim()) {
    if (!account) {
      const hashedPassword = await hashAccountPassword(password);
      account = await Account.create(
        { username, password: hashedPassword, userId },
        { transaction }
      );
    } else {
      account.username = username;
      if (password?.trim()) {
        account.password = await bcrypt.hash(password, 10);
      }
      await account.save({ transaction });
    }
  }

  if (account && Array.isArray(roles)) {
    await account.setRoles(roles, { transaction });
  }

  return account;
}

async function upsertUserEmail(userId, email, transaction) {
  if (email === undefined) return;

  const [row] = await UserData.findOrCreate({
    where: { idUser: userId },
    defaults: { idUser: userId },
    transaction,
  });

  await row.update({ personalEmail: email?.trim() || null }, { transaction });
}

function mapUserRow(row) {
  const accounts = row.Accounts || row.accounts || [];
  const primary = accounts[0] || null;
  const extra =
    row.userData ||
    row.user_datum ||
    row.UserDatum ||
    row.userDatum ||
    row.user_data ||
    null;

  return {
    ...row,
    Accounts: undefined,
    accounts: undefined,
    userData: undefined,
    user_datum: undefined,
    UserDatum: undefined,
    userDatum: undefined,
    user_data: undefined,
    email: extra?.personalEmail ?? extra?.institutionalEmail ?? null,
    account: primary
      ? {
          id: primary.id,
          username: primary.username,
          userId: primary.userId,
          roles: primary.roles || primary.Roles || [],
        }
      : null,
  };
}

// ✅ CREATE (addUser) - ignora "photo" que venga en el body
export const addUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { photo, username, password, roles, email, ...rest } = req.body;
    const userData = pickUserFields(rest);

    const newUser = await Users.create(userData, { transaction });

    await upsertAccountForUser(
      newUser.id,
      { username, password, roles },
      transaction
    );
    await upsertUserEmail(newUser.id, email, transaction);

    await transaction.commit();

    return res.json({
      message: "agregado con éxito",
      user: newUser,
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof UniqueConstraintError || error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "Esa cédula ya existe",
      });
    }
    console.error("error al crear el usuario:", error);
    return res.status(500).json({
      message: "Error al crear el usuario",
      error: error.message,
    });
  }
};

// ✅ EDIT (updateUserData) - ignora "photo" que venga en el body
export const updateUserData = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { photo, username, password, roles, email, ...rest } = req.body;
    const userData = pickUserFields(rest);
    const userId = req.params.userId;

    await Users.update(userData, {
      where: { id: userId },
      transaction,
    });

    await upsertAccountForUser(
      userId,
      { username, password, roles },
      transaction
    );
    await upsertUserEmail(userId, email, transaction);

    await transaction.commit();

    return res.json({ message: "usuario editado con éxito" });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await Users.findAll({
      include: [
        {
          model: Account,
          attributes: ["id", "username", "userId"],
          include: [{ model: Roles, attributes: ["id", "name"], through: { attributes: [] } }],
        },
        {
          model: UserData,
          as: "userData",
          attributes: ["personalEmail", "institutionalEmail"],
        },
      ],
      order: [["id", "ASC"]],
    });

    res.json(users.map((user) => mapUserRow(user.toJSON())));
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

  
  export const getOneUser = async (req, res) => {
    const { userId } = req.params;
    try {
      const user = await Users.findOne({
        where: { id: userId },
        include: [
          {
            model: Account,
            attributes: ["id", "username", "userId"],
            include: [{ model: Roles, attributes: ["id", "name"], through: { attributes: [] } }],
          },
          {
            model: UserData,
            as: "userData",
            attributes: ["personalEmail", "institutionalEmail"],
          },
        ],
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json(mapUserRow(user.toJSON()));
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
 

  export const deleteUser = async (req, res) => {
    try {
      const removingUser = await Users.destroy({
        where: {
          id: req.params.userId,
        },
      });
  
      res.json({ message: "Usuario eleminado con éxito" });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  export const addUsersBulk = async (req, res) => {
    let usuarios = req.body; // <-- antes era const


    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({ message: "No hay usuarios para registrar" });
    }
    usuarios = usuarios.map(({ id, ...rest }) => rest);
    try {
      const resultado = await Users.bulkCreate(usuarios, {
        ignoreDuplicates: true, // opcional según tu BD
        returning: true,
      });
  
      res.json({
        insertados: resultado.length,
        detalles: resultado,
      });
    } catch (error) {
      console.error("Error al insertar usuarios:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
    
  }

  



