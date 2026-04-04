--[[
	Package ma tran anh xa game pikachu
	@Author: Minh Nguyen

]]

require("os")
require("math")

local Module = {}

Module.arr = {}
Module.debug = false

Module.MAX_COT = 19 -- chieu rong
Module.MAX_DONG = 8 -- chieu cao

Module.ManChoi = 8
Module.SoBieuTuong = 36

Module.SoPikachu_Conlai = 0
Module.HintStorage = nil

Module.NoItemLeftListener = function ()
	if Module.debug then
		print "Khong con item nao het"
	end
end

Module.new = function ()
	Module.SoPikachu_Conlai = (Module.MAX_DONG-1)*(Module.MAX_COT-1)
	Module.arr = {}
	Module.HintStorage = nil
	Module.init_base_arr()
	Module.random_arr()
end

--[[
	Khoi tao mot mang chua cac cap Pikachu
	@return: void
]]
Module.init_base_arr2 = function()
	if (Module.MAX_DONG-1)*(Module.MAX_COT-1) % 2 ~= 0 then
		io.write("Ma tran "..(Module.MAX_DONG-1).."x"..(Module.MAX_COT-1).." khong the chua cac cap bieu tuong")
		os.exit()
	end

	math.randomseed(os.time())
	local lastItem = -1
	for i=0,Module.MAX_DONG do
		Module.arr[i] = {}
		for j=0,Module.MAX_COT do
			Module.arr[i][j] = {}
			Module.arr[i][j].image = nil
			if i == 0 or j == 0 or i == Module.MAX_DONG or j == Module.MAX_COT then
				Module.arr[i][j].data = 0
			else
				if lastItem == -1 then -- khoi tao lai gia tri lastItem
					lastItem = math.random(1,Module.SoBieuTuong)
					Module.arr[i][j].data = lastItem
				else
					Module.arr[i][j].data = lastItem
					lastItem = -1
				end
			end		
		end
	end
end

Module.init_base_arr = function()
	if (Module.MAX_DONG-1)*(Module.MAX_COT-1) % 2 ~= 0 then
		io.write("Ma tran " .. (Module.MAX_DONG-1) .. "x" .. (Module.MAX_COT-1) .. " khong the chua cac cap bieu tuong")
		os.exit()
	end

	math.randomseed(os.time())
	local index = 0
	local lastItem = -1
	for i=0,Module.MAX_DONG do
		Module.arr[i] = {}
		for j = 0,Module.MAX_COT do
			Module.arr[i][j] = {}
			Module.arr[i][j].image = nil
			if i == 0 or j == 0 or i == Module.MAX_DONG or j == Module.MAX_COT then
				Module.arr[i][j].data = 0
			else
				

				if lastItem == -1 then -- khoi tao lai gia tri lastItem
					index = index + 1

					if (index > Module.SoBieuTuong) then
						index = 1
					end

					lastItem = index
					Module.arr[i][j].data = lastItem
				else
					Module.arr[i][j].data = lastItem
					lastItem = -1
				end
			end		
		end
	end
end

--[[
	Random vi tri cac phan tu trong mang sao cho khong vuot ra ngoai bien
	@return: void
]]
Module.random_arr2 = function ()
	math.randomseed(os.time())
	for i=0,Module.MAX_DONG do
		for j=0,Module.MAX_COT do
			if i==0 or j==0 or i==Module.MAX_DONG or j==Module.MAX_COT then
			else
				local rd_row = math.random(1,Module.MAX_DONG-1)
				local rd_col = math.random(1,Module.MAX_COT-1)
				Module.swap_item(Module.arr[i][j], Module.arr[rd_row][rd_col])
			end
		end
	end
end


--[[
	Random vi tri cac phan tu trong mang sao cho khong vuot ra ngoai bien
	@return: void
]]
Module.random_arr = function ()
	
	math.randomseed(os.time())
	local danhsach_pokemon_conlai = {}
	local count = 0
	-- lap ra danh sach nhung pokemon con lai
	for i=0,Module.MAX_DONG do
		for j=0,Module.MAX_COT do		
			if Module.arr[i][j].data ~= 0 then
				danhsach_pokemon_conlai[count] = Module.arr[i][j].data
				count = count + 1
			end
		end
	end
 
  	-- tron danh sach
	for i=0,count-1 do
		local rd_i = math.random(0,count-1)
		local temp = danhsach_pokemon_conlai[i]
		danhsach_pokemon_conlai[i] = danhsach_pokemon_conlai[rd_i]
		danhsach_pokemon_conlai[rd_i] = temp
	end

	-- tra gia tri lai cho mang
	local k = 0
	for i=1,Module.MAX_DONG-1 do
		for j=1,Module.MAX_COT-1 do		
			if Module.arr[i][j].data ~= 0 then
				Module.arr[i][j].data = danhsach_pokemon_conlai[k]
				k = k + 1
				if k >= count then
					break
				end
			end
		end
	end
end


--[[
	Xuat mang
	@return: void
]]
Module.print_arr = function ()
	print ""
	for i=0,Module.MAX_DONG do
		for j=0,Module.MAX_COT do
			io.write (Module.arr[i][j].data .. " ")
		end
		io.write "\n"
	end
	print ""
end

--[[
	Xuat duong di
	@param: ds chua cac doi tuong Point(x,y)
	@return: void
]]
Module.print_path = function (path)
	for i,v in ipairs(path) 
		do 
		print(v.x .. "," .. v.y .. " -> ")
	end

end


Module.swap_item = function (a,b)
	a.data, b.data = b.data, a.data
end

--[[
	Kiem tra dong R , xem tu cot y1 -> y2 co vat can khong
	@Param: toa do y1, toa do y2, dong r 
	@return: bool
]]
Module.KiemTradt_Ngang = function (y1, y2, r)
	if Module.debug then 
		print("Kiem tra dong " .. r .." cot " .. y1 .. " -> " ..y2)
	end
	local min = math.min(y1, y2)
	local max = math.max(y1, y2)
	for i=min,max do
		if Module.arr[r][i].data ~= 0 then
			return false
		end
	end
	return true
end

--[[
	Kiem tra cot C , xem tu x1 -> x2 co vat can khong
	@Param: toa do x1, toa do x2, cot c
	@return: bool
]]
Module.KiemTradt_Dung = function (x1, x2, c)
	if Module.debug then 
		print("Kiem tra cot " .. c .." dong " .. x1 .. " -> " ..x2)
	end
	local min = math.min(x1, x2)
	local max = math.max(x1, x2)
	for i=min,max do
		if Module.arr[i][c].data ~= 0 then
			return false
		end
	end
	return true
end

--[[
	Duyet HCN Ngang duoc tao tu 2 diem p1, p2
	@param: p1, p2 (Toa do 2 diem p1, p2)
	@return: pos (Vi tri cot y tim duong)
]]
Module.DuyetNgang_Z = function (p1, p2)
	
	local pMinY,pMaxY

	if p1.y < p2.y then
		pMinY,pMaxY = p1,p2
	else
		pMinY,pMaxY = p2,p1
	end

	for col=pMinY.y + 1,pMaxY.y - 1 do
		if Module.KiemTradt_Ngang(pMinY.y+1, col, pMinY.x) 
		  and Module.KiemTradt_Dung(pMinY.x, pMaxY.x, col)
		  and Module.KiemTradt_Ngang(col, pMaxY.y-1, pMaxY.x) then
		  	local path = {}
		  	path[1] = pMinY
			path[2] = {x = pMinY.x, y = col}
			path[3] = {x = pMaxY.x, y = col}
			path[4] = pMaxY
			return path
		end
	end
	return nil
end

--[[
	Duyet HCN Dung duoc tao tu 2 diem p1, p2
	@param: p1, p2 (Toa do 2 diem p1, p2)
	@return: pos (Vi tri dong x tim duong)
]]
Module.DuyetDung_Z = function (p1, p2)
	
	local pMinX,pMaxX	
	
	if p1.x < p2.x then
		pMinX,pMaxX = p1,p2
	else
		pMinX,pMaxX = p2,p1
	end

	for row=pMinX.x + 1,pMaxX.x - 1 do
		if Module.KiemTradt_Dung(pMinX.x+1, row, pMinX.y)
		  and Module.KiemTradt_Ngang(pMinX.y, pMaxX.y, row)
		  and Module.KiemTradt_Dung(row, pMaxX.x-1, pMaxX.y) then
		  	local path = {}
		 	path[1] = pMinX
			path[2] = {x = row, y = pMinX.y}
			path[3] = {x = row, y = pMaxX.y}
			path[4] = pMaxX
		  	return path
		end
	end
	return nil
end

--[[
	Duyet theo chieu ngang hinh chu L 2 diem p1,p2
	@param: p1, p2, t( che do duyet t=1 duyet L->R , t=-1 duyet R->L)
	@return: col (cot duyet duoc)
]]
Module.DuyetNgang_L = function (p1, p2, t)
	local pMinY,pMaxY
	
	if p1.y < p2.y then
		pMinY,pMaxY = p1,p2
	else
		pMinY,pMaxY = p2,p1
	end

	-- Duyet Left -> Right
	if t == 1 then
		local col = pMaxY.y
		local row = pMinY.x
		if Module.KiemTradt_Ngang(pMinY.y+1, pMaxY.y, row) then
			if pMinY.x > pMaxY.x then
				p_near = pMaxY.x+1
			else
				p_near = pMaxY.x-1
			end
			if Module.KiemTradt_Dung(pMinY.x, p_near, col) then
				local path = {}
				path[1] = pMinY
				path[2] = {x = pMinY.x, y = pMaxY.y}
				path[3] = pMaxY
				return path
			end
		end
	end

	-- Kiem tra Right -> Left
	if t == -1 then
		local col = pMinY.y
		local row = pMaxY.x
		if Module.KiemTradt_Ngang(pMinY.y, pMaxY.y-1, row) then
			if pMinY.x > pMaxY.x then
				p_near = pMinY.x-1
			else
				p_near = pMinY.x+1
			end
			if Module.KiemTrad
	elseif manchoi == 5 then -- dich xuong duoi
		Module.DichCotLenXuong(p1.y,-1,0,Module.MAX_DONG)
		Module.DichCotLenXuong(p2.y,-1,0,Module.MAX_DONG)
	elseif manchoi == 6 then -- dich sang 2 ben

		if p1.y < center_y and p2.y < center_y then -- 2 diem nam cung 1 phia ben trai
			Module.DichDongTraiPhai(p1.x,1,0,center_y)
			Module.DichDongTraiPhai(p2.x,1,0,center_y)
		elseif p1.y > center_y and p2.y > center_y then -- 2 diem nam cung 1 phia ben phai
			Module.DichDongTraiPhai(p1.x,-1,center_y,Module.MAX_COT)
			Module.DichDongTraiPhai(p2.x,-1,center_y,Module.MAX_COT)
		else -- 2 diem khac phia
			if p1.y < p2.y then
				Module.DichDongTraiPhai(p1.x,1,0,center_y)
				Module.DichDongTraiPhai(p2.x,-1,center_y,Module.MAX_COT)
			else
				Module.DichDongTraiPhai(p2.x,1,0,center_y)
				Module.DichDongTraiPhai(p1.x,-1,center_y,Module.MAX_COT)
			end
		end

	elseif manchoi == 7 then -- dich 2 ben vao giua

		if p1.y < center_y and p2.y < center_y then -- 2 diem nam cung 1 phia ben trai
			Module.DichDongTraiPhai(p1.x,-1,0,center_y+1)
			Module.DichDongTraiPhai(p2.x,-1,0,center_y+1)
		elseif p1.y > center_y and p2.y > center_y then -- 2 diem nam cung 1 phia ben phai
			Module.DichDongTraiPhai(p1.x,1,center_y-1,Module.MAX_COT)
			Module.DichDongTraiPhai(p2.x,1,center_y-1,Module.MAX_COT)
		else -- 2 diem khac phia
			if p1.y < p2.y then
				Module.DichDongTraiPhai(p1.x,-1,0,center_y+1)
				Module.DichDongTraiPhai(p2.x,1,center_y-1,Module.MAX_COT)
			else
				Module.DichDongTraiPhai(p2.x,-1,0,center_y+1)
				Module.DichDongTraiPhai(p1.x,1,center_y-1,Module.MAX_COT)
			end
		end

	elseif manchoi == 8 then -- dich len tren va xuong

		if p1.x < center_x and p2.x < center_x then -- 2 diem nam cung 1 phia ben tren
			Module.DichCotLenXuong(p1.y,1,0,center_x)
			Module.DichCotLenXuong(p2.y,1,0,center_x)
		elseif p1.x > center_x and p2.y > center_x then -- 2 diem nam cung 1 phia ben duoi
			Module.DichCotLenXuong(p1.y,-1,center_x,Module.MAX_DONG)
			Module.DichCotLenXuong(p2.y,-1,center_x,Module.MAX_DONG)
		else -- 2 diem khac phia
			if p1.x < p2.x then
				Module.DichCotLenXuong(p1.y,1,0,center_x)
				Module.DichCotLenXuong(p2.y,-1,center_x,Module.MAX_DONG)
			else
				Module.DichCotLenXuong(p2.y,1,0,center_x) -- mac dich cot giua se duoc dich sang trai
				Module.DichCotLenXuong(p1.y,-1,center_x,Module.MAX_DONG)
			end
		end

	elseif manchoi == 9 then -- dich tren duoi vao giua

		if p1.x < center_x and p2.x < center_x then -- 2 diem nam cung 1 phia ben tren
			Module.DichCotLenXuong(p1.y,-1,0,center_x+1)
			Module.DichCotLenXuong(p2.y,-1,0,center_x+1)
		elseif p1.x > center_x and p2.x > center_x then -- 2 diem nam cung 1 phia ben duoi
			Module.DichCotLenXuong(p1.y,1,center_x-1,Module.MAX_DONG)
			Module.DichCotLenXuong(p2.y,1,center_x-1,Module.MAX_DONG)
		else -- 2 diem khac phia
			if p1.x < p2.x then
				Module.DichCotLenXuong(p1.y,-1,0,center_x+1)
				Module.DichCotLenXuong(p2.y,1,center_x-1,Module.MAX_DONG)
			else
				Module.DichCotLenXuong(p2.y,-1,0,center_x+1)
				Module.DichCotLenXuong(p1.y,1,center_x-1,Module.MAX_DONG)
			end
		end
	end
end

Module.DichDongTraiPhai = function (dong,kieudich,minY,maxY)
	local center_y = math.floor(Module.MAX_COT/2)
	for cot = 1, Module.MAX_COT-1 do
		if Module.arr[dong][cot].data == 0 then
			local p = {x = dong, y = cot}
			while (p.y > minY and p.y < maxY) do
				if minY == center_y+1 or maxY == center_y-1 then -- Kieu dich keo de dich vao giua 
					Module.arr[p.x][p.y].data = Module.arr[p.x][p.y + kieudich].data					
				else -- kieu dich swap du lieu de dich sang 2 ben
					local temp = Module.arr[p.x][p.y].data
					Module.arr[p.x][p.y].data = Module.arr[p.x][p.y + kieudich].data
					Module.arr[p.x][p.y + kieudich].data = temp
				end
				p.y = p.y + kieudich -- dich trai phai
			end
		end
	end
end

Module.DichCotLenXuong = function (cot,kieudich,minX,maxX)
	local center_x = math.floor(Module.MAX_DONG/2)
	for dong = 1, Module.MAX_DONG-1 do
		if Module.arr[dong][cot].data == 0 then
			local p = {x = dong, y = cot}
			while (p.x > minX and p.x < maxX) do
				if minX == center_x+1 or maxX == center_x-1 then -- Kieu dich keo de dich vao giua 
					Module.arr[p.x][p.y].data = Module.arr[p.x + kieudich][p.y].data
				else -- kieu dich swap du lieu de dich sang 2 ben
					local temp = Module.arr[p.x][p.y].data
					Module.arr[p.x][p.y].data = Module.arr[p.x + kieudich][p.y].data
					Module.arr[p.x + kieudich][p.y].data = temp
				end
				p.x = p.x + kieudich -- dich len xuong
			end
		end
	end
end

Module.getCleanMattrix = function ()
	if Module.SoPikachu_Conlai == 0 then
		return nil
	end

	local mt = Module.arr
	for i=0,Module.MAX_DONG do
		for j=0,Module.MAX_COT do
			mt[i][j].image = nil
		end
	end
	return mt
end

Module.convertJsonToArr = function (json)
	local mt = {} --Module.arr
	for i=0,Module.MAX_DONG do
		mt[i] = {}
		for j=0,Module.MAX_COT do
			mt[i][j] = {}
			mt[i][j].data = json[tostring(i)][tostring(j)].data
			mt[i][j].image = nil
		end
	end
	return mt
end

return Module