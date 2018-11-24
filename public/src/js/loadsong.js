class loadSong{
	constructor(selectedSong, autoPlayEnabled, multiplayer, touchEnabled){
		this.selectedSong = selectedSong
		this.autoPlayEnabled = autoPlayEnabled
		this.multiplayer = multiplayer
		this.touchEnabled = touchEnabled
		loader.changePage("loadsong")
		this.run()
	}
	run(){
		var id = this.selectedSong.folder
		var promises = []
		assets.sounds["start"].play()
		
		this.selectedSong.songBg = this.randInt(1, 5)
		this.selectedSong.songStage = this.randInt(1, 3)
		
		promises.push(new Promise(resolve => {
			var img = document.createElement("img")
			pageEvents.load(img).then(() => {
				this.selectedSong.customBg = true
			}, () => this.songBg(id)).then(resolve)
			img.id = "music-bg"
			img.src = gameConfig.songs_baseurl + id + "/bg.png"
			document.getElementById("assets").appendChild(img)
		}))
		
		promises.push(new Promise((resolve, reject) => {
			var songObj
			assets.songs.forEach(song => {
				if(song.id == id){
					songObj = song
				}
			})
			if(songObj.sound){
				songObj.sound.gain = snd.musicGain
				resolve()
			}else{
				snd.musicGain.load(gameConfig.songs_baseurl + id + "/main.mp3").then(sound => {
					songObj.sound = sound
					resolve()
				}, reject)
			}
		}))
		promises.push(loader.ajax(this.getSongPath(this.selectedSong)).then(data => {
			this.songData = data.replace(/\0/g, "").split("\n")
		}))
		Promise.all(promises).then(() => {
			this.setupMultiplayer()
		}, error => {
			console.error(error)
			alert("An error occurred, please refresh")
		})
	}
	songBg(){
		return new Promise((resolve, reject) => {
			var filename = "bg_song_" + this.selectedSong.songBg
			if(filename + "a" in assets.image && filename + "b" in assets.image){
				resolve()
			}else{
				var promises = []
				for(var i = 0; i < 2; i++){
					let filenameAb = filename + (i === 0 ? "a" : "b")
					let img = document.createElement("img")
					promises.push(pageEvents.load(img).then(() => {
						if(this.touchEnabled){
							return new Promise((resolve, reject) => {
								var canvas = document.createElement("canvas")
								var w = Math.floor(img.width / 2)
								var h = Math.floor(img.height / 2)
								canvas.width = w
								canvas.height = h
								var ctx = canvas.getContext("2d")
								ctx.drawImage(img, 0, 0, w, h)
								canvas.toBlob(blob => {
									let img2 = document.createElement("img")
									pageEvents.load(img2).then(() => {
										assets.image[filenameAb] = img2
										resolve()
									}, reject)
									img2.src = URL.createObjectURL(blob)
								})
							})
						}else{
							assets.image[filenameAb] = img
						}
					}))
					img.src = gameConfig.assets_baseurl + "img/" + filenameAb + ".png"
				}
				Promise.all(promises).then(resolve, reject)
			}
		})
	}
	randInt(min, max){
		return Math.floor(Math.random() * (max - min + 1)) + min
	}
	getSongPath(selectedSong){
		var directory = gameConfig.songs_baseurl + selectedSong.folder + "/"
		if(selectedSong.type === "tja"){
			return directory + "main.tja"
		}else{
			return directory + selectedSong.difficulty + ".osu"
		}
	}
	setupMultiplayer(){
		if(this.multiplayer){
			var loadingText = document.getElementsByClassName("loading-text")[0]
			var waitingText = "Waiting for Another Player..."
			loadingText.firstChild.data = waitingText
			loadingText.setAttribute("alt", waitingText)
			
			this.cancelButton = document.getElementById("p2-cancel-button")
			this.cancelButton.style.display = "inline-block"
			pageEvents.add(this.cancelButton, ["mousedown", "touchstart"], this.cancelLoad.bind(this))
			
			this.song2Data = this.songData
			this.selectedSong2 = this.selectedSong
			pageEvents.add(p2, "message", event => {
				if(event.type === "gameload"){
					this.cancelButton.style.display = ""
					
					if(event.value === this.selectedSong.difficulty){
						this.startMultiplayer()
					}else{
						this.selectedSong2 = {
							title: this.selectedSong.title,
							folder: this.selectedSong.folder,
							difficulty: event.value,
							type: this.selectedSong.type,
							offset: this.selectedSong.offset
						}
						if(this.selectedSong.type === "tja"){
							this.startMultiplayer()
						}else{
							loader.ajax(this.getSongPath(this.selectedSong2)).then(data => {
								this.song2Data = data.replace(/\0/g, "").split("\n")
								this.startMultiplayer()
							}, () => {
								this.startMultiplayer()
							})
						}
					}
				}else if(event.type === "gamestart"){
					this.clean()
					p2.clearMessage("songsel")
					loader.changePage("game")
					var taikoGame1 = new Controller(this.selectedSong, this.songData, false, 1, this.touchEnabled)
					var taikoGame2 = new Controller(this.selectedSong2, this.song2Data, true, 2, this.touchEnabled)
					taikoGame1.run(taikoGame2)
				}else if(event.type === "left" || event.type === "gameend"){
					this.clean()
					new SongSelect(false, false, this.touchEnabled)
				}
			})
			p2.send("join", {
				id: this.selectedSong.folder,
				diff: this.selectedSong.difficulty
			})
		}else{
			this.clean()
			loader.changePage("game")
			var taikoGame = new Controller(this.selectedSong, this.songData, this.autoPlayEnabled, false, this.touchEnabled)
			taikoGame.run()
		}
	}
	startMultiplayer(repeat){
		if(document.hasFocus()){
			p2.send("gamestart")
		}else{
			if(!repeat){
				assets.sounds["sanka"].play()
			}
			setTimeout(() => {
				this.startMultiplayer(true)
			}, 100)
		}
	}
	cancelLoad(event){
		if(event.type === "mousedown"){
			if(event.which !== 1){
				return
			}
		}else{
			event.preventDefault()
		}
		p2.send("leave")
		assets.sounds["don"].play()
		this.cancelButton.style.pointerEvents = "none"
	}
	clean(){
		pageEvents.remove(p2, "message")
		if(this.cancelButton){
			pageEvents.remove(this.cancelButton, ["mousedown", "touchstart"])
			delete this.cancelButton
		}
	}
}
