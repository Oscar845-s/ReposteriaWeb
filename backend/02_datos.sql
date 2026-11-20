-- Nombre: Oscar Armando Medina Guti�rrez
-- Materia: Verificaci�n y Validaci�n de Software
-- Programa: 02_datos.sql
-- Descripci�n: Insertar cat�logos y productos de prueba.
-- Requerimiento: RF03, RF04, RF10, RF11, RF13, RF14, RF15
-- Fecha: 19 de noviembre de 2026
USE DulceHogar;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
INSERT dbo.Roles(nombre) VALUES
(N'Cliente'), (N'Administrador'), (N'Personal de Producci�n');
INSERT dbo.EstadosPedido(idEstado,nombre) VALUES
(1,N'Pendiente'),(2,N'En preparaci�n'),(3,N'Listo para entrega'),
(4,N'Entregado'),(5,N'Cancelado');
INSERT dbo.Categorias(nombre) VALUES
(N'Pasteles'),(N'Pan dulce'),(N'Galletas'),(N'Postres');
INSERT dbo.Productos(idCategoria,nombre,descripcion,precio,stock)
SELECT c.idCategoria, v.nombre, v.descripcion, v.precio, v.stock
FROM (VALUES
(N'Pasteles',N'Pastel de chocolate',N'Pastel de chocolate',320,8),
(N'Pasteles',N'Pastel de fresa',N'Pastel de fresa',350,5),
(N'Pan dulce',N'Concha de vainilla',N'Pan dulce de vainilla',22,20),
(N'Pan dulce',N'Croissant',N'Croissant de mantequilla',38,12),
(N'Galletas',N'Galletas con chispas',N'Galletas de chocolate',25,16),
(N'Postres',N'Brownie',N'Brownie de chocolate',45,0),
(N'Postres',N'Cheesecake',N'Pastel de queso',85,9),
(N'Pan dulce',N'Roles de canela',N'Pan dulce de canela',48,10)
) v(categoria,nombre,descripcion,precio,stock)
JOIN dbo.Categorias c ON c.nombre = v.categoria;
INSERT dbo.MovimientosInventario(idProducto,cambio,motivo)
SELECT idProducto,stock,N'Inventario inicial' FROM dbo.Productos WHERE stock > 0;
COMMIT;
GO