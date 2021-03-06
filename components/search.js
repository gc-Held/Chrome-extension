var fetch=fetch || {};
fetch.Stapes=fetch.Stapes || {}

fetch.Stapes.DomainHeader=Stapes.subclass({
	constructor: function($parent, item) {
		var template=$("#domain-header").html();
		Mustache.parse(template);
		this.$el=$(Mustache.render(template, item));
		this.item=item;

		var self=this;
		this.$el.find(".collapse-links").on("click", function() {
			self.emit("nav_back");
		});

		this.$el.find("[name=blacklist]").on("click", function() {
			self.blacklist();	
		});

		$parent.append(this.$el);	
	}, 
	blacklist: function() {
		var user=fetch.user.get("userId");
		var removeUrl = fetch.conf.server + "/fetch/v2/blacklist/";
		var self=this;
		var data = $.ajax({
			type: "PUT",
			async: true,
			crossDomain: "true",
			data: {
				user: user,
				sites: self.item.baseUrl,
				append: true
			},
			url: removeUrl
		});
		this.emit("nav_back");
	}	
});

fetch.Stapes.SearchResult=Stapes.subclass({
	constructor: function($parent, item) {
		this.item=item;
		var linkLength=40;
		
		var timeSpent = item.duration;
		item.minutes = Math.floor(timeSpent / 60);
		item.seconds = timeSpent % 60;
/*		var pageTitle = item.pageTitle;
		if (pageTitle.length >= linkLength) {
			pageTitle = pageTitle.substr(0, linkLength);
			pageTitle = pageTitle.concat('...');
		}
		item.pageTitle=pageTitle;*/
		item.snapshotUrl=fetch.conf.server+"/fetch/s/"+item.id+"/";
		item.textUrl=fetch.conf.server+"/fetch/t/"+item.id+"/";
		
		var template=$("#search-result").html();
		Mustache.parse(template);
		this.$el=$(Mustache.render(template, item));

		var self=this;
		this.$el.find(".expand-links").on("click", function() {
			self.emit("expand_links", item);
		});

		this.$el.find(".search-link").on("click", function() {
			fetch.analytics.pushEvent("url-opened", self.item.pageId);
		});

		this.$el.find(".snapshot-button").on("click", function() {
			fetch.analytics.pushEvent("snapshot-opened", self.item.snapshotUrl);
		});

		this.$el.find(".text-button").on("click", function() {
			fetch.analytics.pushEvent("text-version-opened", self.item.textUrl);
		});
		
		$parent.append(this.$el);	
	},
	hideExpandLinks: function() {
		this.$el.find(".expand-links").hide();
	}
});

fetch.Stapes.FrontPage=Stapes.subclass({
	constructor: function() {
		this.set("loading", false);
		this.set("expand_links", true);
	},
	loadPage: function(page) {
		if(this.get("loading"))
			return;
		this.set("loading", true);

		fetch.activity.show();
		var self=this;
		var data = $.ajax({
			type: "GET",
			async: true,
			crossDomain: "true",
			url: fetch.conf.server + "/fetch/history/",
			data: {
				page: page
			},
			success: function(data) {
				if (!$.isEmptyObject(data.objects)) {
					self.emit("items", data.objects);
				} else {
					self.emit("items", []);
				}
				self.set("loading", false);
				fetch.activity.hide();
			},
			error: function(data) {
				this.emit("error", data);
				this.set("loading", false);
				fetch.activity.hide();
			}
		});
	},	
	header: function($parent) {
		return undefined;
	}
});

fetch.Stapes.SearchPage=Stapes.subclass({
	constructor: function(search_query) {
		this.set("loading", false);
		this.set("expand_links", false);
		this.set("search_query", search_query);
	},
	loadPage: function(page) {
		if(this.get("loading"))
			return;
		this.set("loading", true);

		fetch.activity.show();
		var self=this;
		var data = $.ajax({
			type: "GET",
			async: true,
			crossDomain: "true",
			url: fetch.conf.server + "/fetch/search/",
			data: {
				query: self.get("search_query"),
				page: page
			},
			success: function(data) {
				if (!$.isEmptyObject(data.objects)) {
					self.emit("items", data.objects);
				} else {
					self.emit("items", []);
				}
				self.set("loading", false);
				fetch.activity.hide();
			},
			error: function(data) {
				this.emit("error", data);
				this.set("loading", false);
				fetch.activity.hide();
			}
		});
	},	
	header: function($parent) {
		return undefined;
	}
});

fetch.Stapes.DomainPage=Stapes.subclass({
	constructor: function(item) {
		this.item=item;
		this.set("loading", false);
		this.set("expand_links", false);
		this.set("base_url", item.baseUrl);
	},
	loadPage: function(page) {
		if(this.get("loading"))
			return;
		this.set("loading", true);

		fetch.activity.show();
		var self=this;
		var data = $.ajax({
			type: "GET",
			async: true,
			crossDomain: "true",
			url: fetch.conf.server + "/fetch/history/",
			data: {
				domain: self.get("base_url"),
				page: page
			},
			success: function(data) {
				if (!$.isEmptyObject(data.objects)) {
					self.emit("items", data.objects);
				} else {
					self.emit("items", []);
				}
				self.set("loading", false);
				fetch.activity.hide();
			},
			error: function(data) {
				this.emit("error", data);
				this.set("loading", false);
				fetch.activity.hide();
			}
		});
	},
	header: function($parent) {
		return new fetch.Stapes.DomainHeader($parent, this.item);
	}
});

fetch.Stapes.RecentSearches=Stapes.subclass({
	constructor: function($element) {
		this.$el=$element;

		this.updateRecentSearches();		
	},
	updateRecentSearches: function() {
		var self=this;
		chrome.storage.local.get("recentSearches", function(items) {
			var searches=items.recentSearches;
			if(searches==undefined || searches.length==0) 
				return;
			else {
				var html="Recent Searches: "
				for(var i=0;i<searches.length;i++) {
					html=html+'<a href="/searchtab.html?q='+searches[i]+'">'+searches[i]+'</a> ';
				}	
				self.$el.html(html);
			}		
		});	
	},
	addSearch: function(search_query) {
		chrome.storage.local.get("recentSearches", function(items) {
			var searches=items.recentSearches;
			if(searches==undefined || searches.length==0) 
				searches=[search_query];	
			else {
				for(var i=0;i<searches.length;i++)
					if(searches[i]==search_query)
						break;
				if(i==searches.length)
					searches.push(search_query);
			}		
			if(searches.length>5)
				searches.shift();

			chrome.storage.local.set({"recentSearches":searches});
		});	
	}	
});
