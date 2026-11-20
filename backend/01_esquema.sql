-- Nombre: Oscar Armando Medina Gutiérrez
-- Materia: Verificación y Validación de Software
-- Programa: 01_esquema.sql
-- Descripción: Crear la base de datos y sus restricciones.
-- Requerimiento: RF01-RF20 (soporte de persistencia)
-- Fecha: 19 de noviembre de 2026
USE master;
GO
CREATE DATABASE DulceHogar;
GO
USE DulceHogar;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
CREATE TABLE dbo.Roles (
  idRol INT IDENTITY PRIMARY KEY,
  nombre NVARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE dbo.Usuarios (
  idUsuario INT IDENTITY PRIMARY KEY,
  idRol INT NOT NULL REFERENCES dbo.Roles(idRol),
  nombre NVARCHAR(120) NOT NULL,
  correo NVARCHAR(254) COLLATE Latin1_General_100_CI_AS NOT NULL UNIQUE,
  contrasenaHash NVARCHAR(255) NOT NULL,
  esActivo BIT NOT NULL DEFAULT 1,
  fechaRegistro DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CHECK (LEN(LTRIM(RTRIM(nombre))) > 0)
);
CREATE TABLE dbo.Categorias (
  idCategoria INT IDENTITY PRIMARY KEY,
  nombre NVARCHAR(100) NOT NULL UNIQUE,
  esActiva BIT NOT NULL DEFAULT 1
);
CREATE TABLE dbo.Productos (
  idProducto INT IDENTITY PRIMARY KEY,
  idCategoria INT NOT NULL REFERENCES dbo.Categorias(idCategoria),
  nombre NVARCHAR(120) NOT NULL,
  descripcion NVARCHAR(1000) NOT NULL,
  imagen NVARCHAR(500) NULL,
  precio DECIMAL(12,2) NOT NULL CHECK (precio > 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  esActivo BIT NOT NULL DEFAULT 1
);
CREATE TABLE dbo.Carritos (
  idCarrito INT IDENTITY PRIMARY KEY,
  idUsuario INT NOT NULL UNIQUE REFERENCES dbo.Usuarios(idUsuario)
);
CREATE TABLE dbo.DetalleCarrito (
  idCarrito INT NOT NULL REFERENCES dbo.Carritos(idCarrito),
  idProducto INT NOT NULL REFERENCES dbo.Productos(idProducto),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  PRIMARY KEY (idCarrito, idProducto)
);
CREATE TABLE dbo.EstadosPedido (
  idEstado INT PRIMARY KEY,
  nombre NVARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE dbo.Pedidos (
  idPedido INT IDENTITY PRIMARY KEY,
  idUsuario INT NOT NULL REFERENCES dbo.Usuarios(idUsuario),
  idEstado INT NOT NULL REFERENCES dbo.EstadosPedido(idEstado),
  fechaPedido DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE dbo.DetallePedido (
  idPedido INT NOT NULL REFERENCES dbo.Pedidos(idPedido),
  idProducto INT NOT NULL REFERENCES dbo.Productos(idProducto),
  nombreProducto NVARCHAR(120) NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precioUnitario DECIMAL(12,2) NOT NULL CHECK (precioUnitario > 0),
  subtotal AS (cantidad * precioUnitario) PERSISTED,
  PRIMARY KEY (idPedido, idProducto)
);
CREATE TABLE dbo.MovimientosInventario (
  idMovimiento INT IDENTITY PRIMARY KEY,
  idProducto INT NOT NULL REFERENCES dbo.Productos(idProducto),
  idUsuario INT NULL REFERENCES dbo.Usuarios(idUsuario),
  idPedido INT NULL REFERENCES dbo.Pedidos(idPedido),
  cambio INT NOT NULL CHECK (cambio <> 0),
  motivo NVARCHAR(200) NOT NULL,
  fechaMovimiento DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Productos_Categoria ON dbo.Productos(idCategoria);
CREATE INDEX IX_Pedidos_UsuarioFecha ON dbo.Pedidos(idUsuario, fechaPedido);
CREATE INDEX IX_Pedidos_Estado ON dbo.Pedidos(idEstado);
CREATE INDEX IX_Movimientos_ProductoFecha
  ON dbo.MovimientosInventario(idProducto, fechaMovimiento);
COMMIT;
GO
CREATE VIEW dbo.vwCatalogo AS
SELECT p.idProducto, p.nombre, p.descripcion, c.nombre AS categoria,
       p.precio, p.stock, p.imagen
FROM dbo.Productos p JOIN dbo.Categorias c ON c.idCategoria = p.idCategoria
WHERE p.esActivo = 1 AND c.esActiva = 1;
GO
CREATE VIEW dbo.vwTotalesPedido AS
SELECT p.idPedido, p.idUsuario, p.idEstado, p.fechaPedido,
       COALESCE(SUM(d.subtotal), 0) AS total
FROM dbo.Pedidos p LEFT JOIN dbo.DetallePedido d ON d.idPedido = p.idPedido
GROUP BY p.idPedido, p.idUsuario, p.idEstado, p.fechaPedido;
GO