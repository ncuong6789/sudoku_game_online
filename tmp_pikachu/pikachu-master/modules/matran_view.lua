require("transition")
require("audio")
require("media")
local utility = require( "utility" )
local json = require( "json" )

local composer = require("composer")

local sampleUI = require( "sampleUI.sampleUI" )

-- TODO: xem lai quan ly am thanh va giao dien
local Matran = require("modules.matran_controller")
local board = nil

local round_timer = 600*1000 -- mil sec
local round_time_played = 0

local countdownbar_startAt = 0
local countdownbar_pauseAt = 0
local timerID = nil

local countdownbar
local viewManchoi
local btnHelp
local help_used
local max_help = 300

Module = {}
Module.CELL_WIDTH = 30 -- chieu rong cua o
Module.CELL_HEIGHT = 37 -- chieu cao cua o

Module.gbOffsetX = -15 + Module.CELL_WIDTH
Module.gbOffsetY = 10 + Module.CELL_HEIGHT

Module.theme = "pokemon"
Module.debug = true

local mainGroup, pikachuContainer, pikachuGroup

Module.point1 = nil -- Toa do 1 diem da duoc chon

Module.BackgroundMusicList = {
	{ isPlayed = false, fileName = "bg1.ogg"},
	{ isPlayed = false, fileName = "bg2.ogg"},
	{ isPlayed = false, fileName = "bg3.ogg"},
	{ isPlayed = false, fileName = "bg4.ogg"},
	{ isPlayed = false, fileName = "bg5.ogg"},
	{ isPlayed = false, fileName = "bg6.ogg"},
	length = 6,
	isPlaying = false,
	currentPlaying = nil
}


sampleUI.quitBtnRelease = function ()
	native.requestExit()
end

sampleUI.homeBtnRelease = function ()
	Module.saveGame()
	composer.gotoScene( "scenes.menu", { time = 250, effect = "fade" } )
end

sampleUI.resumeBtnRelease = function ()
	local event = {}
	event.phase = "began"
	sampleUI.infoButton.listener(event)
end

sampleUI.onInfoEvent = function (event)
	if event.phase == "will" and timerID then
		if event.action == "show" then
			timer.pause( timerID )
		else
			timer.resume( timerID )
		end
	end

	if (event.action == "hide" and event.phase == "did") then
		audio.resume(Module.BackgroundMusicList.currentPlaying)
	end
end

Module.new = function (group)
	help_used = 0
	countdownbar_startAt = 0
	countdownbar_pauseAt = 0
	Module.loadSaveGame()
	if group ~= nil then
		sampleUI:newUI()
		--display.getCurrentStage():insert( sampleUI.backGroup )
		mainGroup = display.newGroup()
		pikachuContainer = display.newGroup()
		--display.getCurrentStage():insert( sampleUI.frontGroup )

		group:insert( sampleUI.backGroup )
		group:insert( mainGroup )
		group:insert( pikachuContainer )
		group:insert( sampleUI.frontGroup )
	end

	pikachuGroup = display.newGroup()
	pikachuContainer:insert( pikachuGroup )
	-- TODO: dua vao pixel cua tung thiet bi , tinh ra so dong va so cot hop ly
	-- TODO: cai thien lai cac hinh anh + kich thuoc khung anh + toi uu cong thuc tinh pixel

	if Module.debug then
		Matran.print_arr()
	end
	
	board = display.newImageRect("assets/images/" .. Module.theme .. "/bg.jpg", 640, 320)
	board.x = display.contentCenterX
	board.y = display.contentCenterY

	sampleUI.backGroup:insert( board )

	local paint = {
	    type = "gradient",
	    color1 = { 1, 0, 0 },
	    color2 = { 1, 1, 1 },
	    direction = "down"
	}

	countdownbar = display.newRect( 225, 20, 420, 20 )
	countdownbar.strokeWidth = 1
	countdownbar:setFillColor( paint )
	countdownbar:setStrokeColor( 0.6, 1, 0.2 )
	mainGroup:insert( countdownbar )

	function countdownbar:timer( event )
		if countdownbar_startAt == 0 then
			countdownbar_startAt = event.time
		end

		if ( countdownbar_pauseAt > 0 ) then
			countdownbar_startAt = countdownbar_startAt + ( event.time - countdownbar_pauseAt )
			countdownbar_pauseAt = 0
		end

		round_time_played = event.time-countdownbar_startAt
		if self then
			self.path.x3 = -( round_time_played/round_timer )*self.width
			self.path.x4 = self.path.x3
		end

		if ( round_time_played >= round_timer) then
			if Module.debug then
				print "DEBUG: game timeout"
			end
			if timerID ~= nil then
				timer.cancel( timerID )
				timerID = nil
			end
			Module.GameTimeout()
		end	
	end

	timerID = timer.performWithDelay( 100, countdownbar, round_timer )

	viewManchoi = display.newImageRect( "assets/images/level/"..(Matran.ManChoi)..".png", 30, 30 )
	viewManchoi.x = display.contentWidth - 110
	viewManchoi.y = 20
	mainGroup:insert( viewManchoi )


	btnHelp = display.newImageRect( "assets/images/help.png", 28, 28 )
	btnHelp.x = display.contentWidth - 70
	btnHelp.y = 20
	mainGroup:insert( btnHelp )


	if help_used >= max_help then
		btnHelp.isVisible = false
	end

	btnHelp:addEventListener( "touch", btnHelp)
	function btnHelp:touch( event )
		if ( event.phase ~= "began" ) then
			return false
		end

		local p1,p2 = Matran.getHint()
		if p1 and p2 then
			if p1 and p2 then
		
				if Matran.arr[p1.x][p1.y].data ~= 0 
					and Matran.arr[p1.x][p1.y].image ~= nil
					and Matran.arr[p2.x][p2.y].data ~= 0 
					and Matran.arr[p2.x][p2.y].image ~= nil
				then
					help_used = help_used + 1
					if help_used >= max_help then
						btnHelp.isVisible = false
					end

					local event = {}
					event.phase = "began"
					if Matran.arr[p2.x][p2.y].image ~= nil then
						Matran.arr[p1.x][p1.y].image:touch(event)
					end
				
					local function listener( event )
						local e = {}
						e.phase = "began"
						if Matran.arr[p2.x][p2.y].image ~= nil then
			    			Matran.arr[p2.x][p2.y].image:touch(e)
			    		end
					end
					timer.performWithDelay( 300, listener ,1)
				end
			end
		end
	end

	if Module.BackgroundMusicList.isPlaying == false then	
		Module.playBackgroundMusic()
	end

	Module.spawnAllPieces()
	-- TODO KIEM TRA LAI RANDOM
	--Module.AutoPlay()
	if group ~= nil then
		Module.AfterNewGameObject()
	end

end

Module.AfterNewGameObject = function ()
	local function onKeyEvent( event )
		if ( event.keyName == "back") then
			if sampleUI:isInfoShowing() == false then
				local e = {}
				e.phase = "began"
				countdownbar_pauseAt = system.getTimer()
				sampleUI.infoButton.listener(e)
			end
	       	return true
	    end

	    return false
	end
	Runtime:addEventListener( "key", onKeyEvent )
	
	local btnSetting = display.newImageRect( "assets/images/setting.png", 32, 32 )
	btnSetting.x = display.contentWidth - 29
	btnSetting.y = 20
	mainGroup:insert( btnSetting )
	
	btnSetting:addEventListener( "touch", btnSetting)
	function btnSetting:touch( event )
		countdownbar_pauseAt = system.getTimer()
		--audio.pause(Module.BackgroundMusicList.currentPlaying)
		sampleUI.infoButton.listener(event)
	end
end

--[[
	Background Music random
	@return: void
]]
Module.playBackgroundMusic = function()
	local length = Module.BackgroundMusicList.length
	math.randomseed( os.time() )
	local rd = math.random( 1, length)

	-- neu ban nhac da duoc play
	if Module.BackgroundMusicList[rd].isPlayed then
		local flag = false
		for i=1,length do
			if Module.BackgroundMusicList[i].isPlayed == false then
				rd = i
				flag = true
				break
			end
		end

		-- neu tat ca ban nhac duoc play reset lai list
		if flag == false then
			for i=1,length do
				Module.BackgroundMusicList[i].isPlayed = false
			end			
		end
	end
	if Module.debug then
		print("DEBUG: playing background music: "..Module.BackgroundMusicList[rd].fileName)
	end
	Module.BackgroundMusicList[rd].isPlayed = true
	Module.BackgroundMusicList.isPlaying = true
	Module.BackgroundMusicList.currentPlaying = media.playSound("assets/audio/" .. Module.BackgroundMusicList[rd].fileName ,
			Module.BackgroundMusic_onComplete
		)
end

--[[
	Background Music onComplete
	@return: void
]]
Module.BackgroundMusic_onComplete = function ( event )
	print "Background music complete"
	Module.playBackgroundMusic()
end 


--[[
	Play Sound
	@return: void
]]
Module.playSound = function (fileName,options)
	--{ channel=1, loops=-1, fadein=0 }

	local s = audio.loadStream( fileName )
	if s then
		return audio.play( s , option )
	end
	return nil
end

--[[
	Su kien reload lai Matran
	@return: void
]]
Module.ReloadMaTranListener = function ()
	if Module.debug then
		print "Listener reload lai ma tran duoc goi"
	end

	pikachuGroup:removeSelf()
	pikachuGroup = display.newGroup( )
	pikachuContainer:insert( pikachuGroup )

	for i=1,Matran.MAX_DONG-1 do
		for j=1,Matran.MAX_COT-1 do
			Matran.arr[i][j].image = nil
		end
	end
	Module.spawnAllPieces()
end


--[[
	Su kien khong con cap pikachu nao tren matran
	@return: void
]]
Matran.NoItemLeftListener = function ()
	btnHelp:removeSelf()
	btnHelp = nil
	local myData = utility.loadTable("myData.json")
	countdownbar:removeSelf()
	pikachuGroup:removeSelf()

	timer.cancel( timerID )
	timerID = nil

	local text =  "Text to be displayed"

	local round_point = math.floor((round_timer-round_time_played)/1000 - help_used*10)
	Matran.new()
	Matran.ManChoi = Matran.ManChoi + 1
	help_used = 0
	round_time_played = 0
	myData.saveGame.totalpoints = myData.saveGame.totalpoints + round_point

	if myData.settings.bestScore < myData.saveGame.totalpoints then
		myData.settings.bestScore = myData.saveGame.totalpoints
	end

	local showHighscore = false
	if Matran.ManChoi > 9 then
		showHighscore = true
		Matran.ManChoi = 1
		text = "You Win !! Total points "..myData.saveGame.totalpoints.. " points"
	else
		text = "You Win ! Scored "..round_point.." points"
	end
	utility.saveTable(myData,"myData.json")


	local myText = display.newText( text, display.contentCenterX, display.contentCenterY - 100, native.systemFont, 30 )
	myText:setFillColor( 1, 0, 0 )
	mainGroup:insert( myText )

	local btnNextlevel = display.newImageRect( "assets/images/nextlevel.png", 200, 100 )
	btnNextlevel.x = display.contentCenterX
	btnNextlevel.y = display.contentCenterY
	mainGroup:insert( btnNextlevel )
	btnNextlevel:addEventListener( "touch", btnNextlevel)
	
	function btnNextlevel:touch(event)
	    myText:removeSelf()
	    myText = nil

	    viewManchoi:removeSelf()
	    viewManchoi = nil

	    btnNextlevel:removeSelf()
	    btnNextlevel = nil

	    Module.ClearGame()
	    Module.new(nil)
	end


	--show the high score pannel
	if myData.saveGame.totalpoints == myData.settings.bestScore and showHighscore then
		btnNextlevel:removeSelf()
		btnNextlevel = nil

		local name_field = native.newTextField(display.contentCenterX,display.contentCenterY - 50,180,30)
		local btnSubmit = display.newImageRect( "assets/images/btnSubmit.png", 150, 50 )
		btnSubmit.x = display.contentCenterX
		btnSubmit.y = display.contentCenterY
		mainGroup:insert( btnSubmit )
		btnSubmit:addEventListener( "touch", btnSubmit)

		function btnSubmit:touch(event)
			local myData = utility.loadTable("myData.json")
			myData.settings.bestScoreName = name_field.text
		    utility.saveTable(myData,"myData.json")

			name_field:removeSelf()
			name_field = nil

		    myText:removeSelf()
		    myText = nil

		    viewManchoi:removeSelf()
		    viewManchoi = nil

		   btnSubmit:removeSelf()
		   btnSubmit = nil

		    Module.ClearGame()
		    
		   	composer.gotoScene( "scenes.highscore", { time = 250, effect = "fade" } )
		    -- TODO: goto high score scene

		end
	end	

end

--[[
	Coundown bar timeout
	@return: void
]]
Module.GameTimeout = function ()
	
	countdownbar:removeSelf()
	pikachuGroup:removeSelf()
	for i=1,Matran.MAX_DONG-1 do
		for j=1,Matran.MAX_COT-1 do
			Matran.arr[i][j].image = nil
		end
	end

	local myText = display.newText( "Game Over!!!", display.contentCenterX, display.contentCenterY-100, native.systemFont, 30 )
	myText:setFillColor( 1, 0, 0 )
	mainGroup:insert( myText )
	
	local btnPlayagain = display.newImageRect( "assets/images/playagain.png", 218, 108 )
	btnPlayagain.x = display.contentCenterX
	btnPlayagain.y = display.contentCenterY
	mainGroup:insert( btnPlayagain )
	btnPlayagain:addEventListener( "touch", btnPlayagain)
	btnHelp:removeSelf()
	btnHelp = nil
	function btnPlayagain:touch(event)
	    myText:removeSelf()
	    myText = nil

	    viewManchoi:removeSelf()
	    viewManchoi = nil

	    btnPlayagain:removeSelf()
	    btnPlayagain = nil

	    Module.ClearGame()
	    local myData = utility.loadTable("myData.json")
        myData.saveGame.matrix = nil
        myData.saveGame.level = 1
        utility.saveTable(myData,"myData.json")

	    Module.new(nil)
	    -- TODO: next level effect here 
	    -- level controller 
	end

	--myText:touch({})
end


--[[
	Clear game hien tai
	@return: void
]]
Module.ClearGame = function ()
	-- pikachu group should remove first
	board:removeSelf()
	Matran.SoPikachu_Conlai = (Matran.MAX_DONG-1)*(Matran.MAX_COT-1)
end

--[[
	Tao ra 1 anh
	@param: data, x, y 
	data la id con pikachu, x la so dong, y la so cot
	vi tri cua hinh anh duoc tao ra dua vao vi tri toa di nhan cho kich thuoc o

	@return: newImageRect va them 2 thuoc tinh kem theo la xPos, yPos la dong x va dong y
]]
Module.spawnPiece = function (data, xPos, yPos)
	if Module.debug then print("SPAWN data=" .. data .. ", x="..xPos..", y="..yPos) end
	if xPos < 1 or xPos > Matran.MAX_DONG-1 
	or yPos < 1 or yPos > Matran.MAX_COT-1 
	or data < 0 or data > Matran.SoBieuTuong
		then
			return nil
	end
	local piece = display.newImageRect( "assets/images/" .. Module.theme .. "/" .. data .. ".jpg", Module.CELL_WIDTH, Module.CELL_HEIGHT )

	-- Vi tri anh xa trong ma tran
	piece.xPos = xPos
	piece.yPos = yPos

	-- Vi tri cua anh
	piece.x = (yPos - 1) * Module.CELL_WIDTH + (Module.CELL_WIDTH * 0.5) + Module.gbOffsetX -- gbOffsetX -- yPos o day la chieu rong
	piece.y = (xPos - 1) * Module.CELL_HEIGHT + (Module.CELL_HEIGHT * 0.5) + Module.gbOffsetY -- gbOffsetY -- xPos o day la chieu cao

	piece:addEventListener( "touch", piece )

	function piece:touch( event )
	    Module.event_Chon1Anh(self,event)
	end 
	pikachuGroup:insert(piece)
	return piece
end

--[[
	Tao ra danh sach tat ca cac anh
	@return: void
]]
Module.spawnAllPieces = function ()
	for i=1,Matran.MAX_DONG-1 do
		for j=1,Matran.MAX_COT-1 do
			if Matran.arr[i][j].data ~= 0 then
				Matran.arr[i][j].image = Module.spawnPiece(Matran.arr[i][j].data, i, j)
			end
		end
	end
end


--[[
	Xoa mot hinh anh tai vi tri x,y hieu ung khi xoa fadeout
	@param: x,y
	@return: void
]]
Module.removePiece = function ( p )
	if p then
		if Matran.arr[p.x][p.y].image ~= nil then
			Matran.arr[p.x][p.y].image:removeSelf()
			Matran.arr[p.x][p.y].image = nil
		end
	end
end

--[[
	Remove Select effect
	@param: p (point)
	@return: void
]]
Module.removeSelectEffect = function (p)
	local piece = Matran.arr[p.x][p.y].image
	if piece then
		piece.strokeWidth = 0
	end
end

--[[
	Reload lai dong
	@param: dong can reload
	@return: void
]]
Module.ReloadNgang = function (dong)
	for cot=1,Matran.MAX_COT-1 do
		Module.removePiece({ x = dong , y = cot})
	end
	
	for cot=1,Matran.MAX_COT-1 do
		if Matran.arr[dong][cot].data ~= 0 then
			Matran.arr[dong][cot].image = Module.spawnPiece(Matran.arr[dong][cot].data, dong, cot)
		end
	end	

end

--[[
	Reload lai cot
	@param: cot can reload
	@return: void
]]
Module.ReloadDung = function (cot)
	for dong=1,Matran.MAX_DONG-1 do
		Module.removePiece({ x = dong , y = cot})
	end

	for dong=1,Matran.MAX_DONG-1 do
		if Matran.arr[dong][cot].data ~= 0 then
			Matran.arr[dong][cot].image = Module.spawnPiece(Matran.arr[dong][cot].data, dong, cot)
		end
	end	
end

--[[
	Dich man choi
	@param: p1,p2,manchoi
]]
Module.DichManChoi = function (p1,p2,manchoi)
	if manchoi == 1 then -- dung yen
	elseif manchoi == 2 or manchoi == 3 or manchoi == 6 or manchoi == 7 then -- dich sang trai hoac phai
		Module.ReloadNgang(p1.x)
		Module.ReloadNgang(p2.x)
	elseif manchoi == 4 or manchoi == 5 or manchoi == 8 or manchoi == 9 then-- dich len tren hoac xuong duoi
		Module.ReloadDung(p1.y)
		Module.ReloadDung(p2.y)
	end
end

--[[
	Event chon 1 piece
	@param: piece duoc chon, 
]]
Module.event_Chon1Anh = function (piece, event )
	
	if piece == nil then
		return true
	end

	if ( event.phase == "began" ) then
	    if Module.debug then
	    	print( "Touch event began on: " .. piece.xPos .. ", " .. piece.yPos ) 
	    	print("Data = "..Matran.arr[piece.xPos][piece.yPos].data)
	   	end

	   	Module.playSound("assets/audio/tap.ogg",nil)

		-- TODO: cai thien lai code, nhap chuot qua nhanh se gay ra loi game
	   	-- Kiem tra xem da duoc chon chua
	   	
		local point = {}
	   	point.x = piece.xPos
	   	point.y = piece.yPos

	   	local point_temp1 = Module.point1
	   	local point_temp2 = point

   		-- hieu ung khi chon
		piece.stroke = { type = "gradient",
   						 color1 = { 1, 0, 0.4 },
    					 color2 = { 1, 0, 0, 0.2 },
    					 direction = "down" }
		piece.strokeWidth = 4
		if piece ~= nil then
			piece:toFront()
		end
   		--piece.isFocus = true

   		-- Kiem tra xem da chon diem nao truoc chua
	   	if point_temp1 then
	   		if point_temp1.x == point_temp2.x and point_temp1.y == point_temp2.y then
		   		return true
		   	end

	   		Module.point1 = nil 		
	   		local t = Matran.KiemTra2Diem(point_temp1, point_temp2)

	   		-- an duoc
	   		if t.status then
	   			if Module.debug then
	   				print("An duoc")
	   			end
	   			
	   			Matran.An2Diem(point_temp1, point)
				
	   			local line = Module.DrawPath(t.path)
	   			transition.fadeOut( line,{ 
	   				time=300 , 
	   				onComplete = function ()
						if line then
							line:removeSelf()
						end

						Module.playSound("assets/audio/lead.ogg",nil)

						-- cap nhat lai hint de xem co duong di khong, neu khong co thi random lai
						if Matran.CheckAvailablePath() == false then
							while Matran.CheckAvailablePath() == false
								do
									print ("Het duong di Random lai ma tran")
									Matran.random_arr()
									Module.ReloadMaTranListener()
								end
						else

		   					Module.removePiece(point_temp1)
							Module.removePiece(point)
							Module.DichManChoi(point_temp1,point,Matran.ManChoi)

						end

						if Module.debug then
							local p3,p4 = Matran.getHint()

							if p3 and p4 then
								Matran.print_arr()
								print("DEBUG : HINT = "..p3.x..","..p3.y.." -> "..p4.x..","..p4.y)
							end
						end
					end 
				})
		   		
	   		-- khong an duoc 
   			else
	   			Module.removeSelectEffect(point_temp1)
	   			Module.point1 = point_temp2
	   		end
	   	-- chua co diem nao duoc chon truoc
	   	else
	   		Module.point1 = point
	   		
	   	end
	   	
	end
	return true
end

--[[
	Ve duong di duoc
	@param : path (chua cac diem di duoc)
	@return: doi tuong newLine (la doi tuong chua duong di)
]]
Module.DrawPath = function ( path )
	if Module.debug then 
		Matran.print_path(path)
	end

	local p1,p2 = path[1], path[2]
	local line = display.newLine(0,0,0,0) -- draw 			`````````````````````````````````````````0,0
	for i,v in ipairs(path) 
		do 
			line:append((v.y)* Module.CELL_WIDTH + Module.gbOffsetX - (Module.CELL_WIDTH/2) , (v.x)* Module.CELL_HEIGHT + Module.gbOffsetY - (Module.CELL_HEIGHT/2))
	end
	line:setStrokeColor( 1, 0, 0.5 )
	line.strokeWidth = 4
	
	return line
	
end

Module.loadSaveGame = function ()
	local myData = utility.loadTable("myData.json")
	if myData.saveGame.matrix ~= nil then
		local temp_myMatrix = json.decode( myData.saveGame.matrix )
		local myConvertedArr = Matran.convertJsonToArr(temp_myMatrix)
		Matran.ManChoi = myData.saveGame.level
		Matran.arr = myConvertedArr
		help_used = myData.saveGame.help_used
		countdownbar_startAt = system.getTimer() - myData.saveGame.timeplayed -- thoi gian bat dau chay timer
		Matran.SoPikachu_Conlai = myData.saveGame.itemleft
	else
		Matran.new()
	end
	Module.theme = myData.settings.theme_name
end

Module.saveGame = function ()
	local myData = utility.loadTable("myData.json")
	myData.saveGame.level = Matran.ManChoi
	myData.saveGame.matrix = json.encode(Matran.getCleanMattrix())
    myData.saveGame.help_used = help_used
	myData.saveGame.timeplayed = round_time_played
    myData.saveGame.itemleft = Matran.SoPikachu_Conlai        
    utility.saveTable( myData, "myData.json" )
end

local function systemEvents(event)
    print("scene game handler " .. event.type)
    if event.type == "applicationExit" then
   		Module.saveGame()
    end
    return true
end
Runtime:addEventListener("system", systemEvents)

return Module
