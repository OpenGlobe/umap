L.U.Popup = L.Popup.extend({

    options: {
        parseTemplate: true
    },

    initialize: function (feature) {
        this.feature = feature;
        this.container = L.DomUtil.create('div', 'umap-popup');
        this.format();
        L.Popup.prototype.initialize.call(this, {}, feature);
        this.setContent(this.container);
    },

    hasFooter: function () {
        return this.feature.hasPopupFooter();
    },

    renderTitle: function () {},

    renderBody: function () {
        var template = this.feature.getOption('popupContentTemplate'),
            container = L.DomUtil.create('div', ''),
            content = '', properties, center;
        if (this.options.parseTemplate) {
            properties = this.feature.extendedProperties();
            // Resolve properties inside description
            properties.description = L.Util.greedyTemplate(this.feature.properties.description || '', properties);
            content = L.Util.greedyTemplate(template, properties);
        }
        content = L.Util.toHTML(content);
        container.innerHTML = content;
        var els = container.querySelectorAll('img,iframe');
        for (var i = 0; i < els.length; i++) {
            this.onElementLoaded(els[i]);
        }
        if (!els.length && container.textContent.replace('\n', '') === '') {
            container.innerHTML = '';
            L.DomUtil.add('h3', '', container, this.feature.getDisplayName());
        }
        return container;
    },

    renderFooter: function () {
        if (this.hasFooter()) {
            var footer = L.DomUtil.create('ul', 'umap-popup-footer', this.container),
                previousLi = L.DomUtil.create('li', 'previous', footer),
                zoomLi = L.DomUtil.create('li', 'zoom', footer),
                nextLi = L.DomUtil.create('li', 'next', footer),
                next = this.feature.getNext(),
                prev = this.feature.getPrevious();
            if (next) {
                nextLi.title = L._('Go to «{feature}»', {feature: next.properties.name || L._('next')});
            }
            if (prev) {
                previousLi.title = L._('Go to «{feature}»', {feature: prev.properties.name || L._('previous')});
            }
            zoomLi.title = L._('Zoom to this feature');
            L.DomEvent.on(nextLi, 'click', function () {
                if (next) next.bringToCenter({zoomTo: next.getOption('zoomTo'), callback: next.view});
            });
            L.DomEvent.on(previousLi, 'click', function () {
                if (prev) prev.bringToCenter({zoomTo: prev.getOption('zoomTo'), callback: prev.view});
            });
            L.DomEvent.on(zoomLi, 'click', function () {
                this.bringToCenter({zoomTo: this.getOption('zoomTo')});
            }, this.feature);
        }
    },

    format: function () {
        var title = this.renderTitle();
        if (title) this.container.appendChild(title);
        var body = this.renderBody();
        if (body) L.DomUtil.add('div', 'umap-popup-content', this.container, body);
        this.renderFooter();
    },

    onElementLoaded: function (el) {
        L.DomEvent.on(el, 'load', function () {
            this._updateLayout();
            this._updatePosition();
            this._adjustPan();
        }, this);
    }

});

L.U.Popup.Large = L.U.Popup.extend({
    options: {
        maxWidth: 500,
        className: 'umap-popup-large'
    }
});

L.U.Popup.BaseWithTitle = L.U.Popup.extend({

    renderTitle: function () {
        var title;
        if (this.feature.getDisplayName()) {
            title = L.DomUtil.create('h3', 'popup-title');
            title.innerHTML = L.Util.escapeHTML(this.feature.getDisplayName());
        }
        return title;
    }

});

L.U.Popup.GeoRSSImage = L.U.Popup.BaseWithTitle.extend({

    options: {
        minWidth: 300,
        maxWidth: 500,
        className: 'umap-popup-large umap-georss-image'
    },

    renderBody: function () {
        var container = L.DomUtil.create('a');
        container.href = this.feature.properties.link;
        container.target = '_blank';
        if (this.feature.properties.img) {
            var img = L.DomUtil.create('img', '', container);
            img.src = this.feature.properties.img;
            // Sadly, we are unable to override this from JS the clean way
            // See https://github.com/Leaflet/Leaflet/commit/61d746818b99d362108545c151a27f09d60960ee#commitcomment-6061847
            img.style.maxWidth = this.options.maxWidth + 'px';
            img.style.maxHeight = this.options.maxWidth + 'px';
            this.onElementLoaded(img);
        }
        return container;
    }

});

L.U.Popup.GeoRSSLink = L.U.Popup.extend({

    options: {
        className: 'umap-georss-link'
    },

    renderBody: function () {
        var title = this.renderTitle(this),
            a = L.DomUtil.add('a');
        a.href = this.feature.properties.link;
        a.target = '_blank';
        a.appendChild(title);
        return a;
    }
});

L.U.Popup.PanelMixin = {

    allButton: function () {
        var button = L.DomUtil.create('li', '');
        L.DomUtil.create('i', 'umap-icon-16 umap-list', button);
        var label = L.DomUtil.create('span', '', button);
        label.innerHTML = label.title = L._('See all');
        L.DomEvent.on(button, 'click', this.feature.map.openBrowser, this.feature.map);
        return button;
    },

    update: function () {
        this.feature.map.ui.openPanel({data: {html: this._content}, actions: [this.allButton()]});
    },

    onRemove: function (map) {
        map.ui.closePanel();
        L.U.Popup.prototype.onRemove.call(this, map);
    },

    _initLayout: function () {this._container = L.DomUtil.create('span');},
    _updateLayout: function () {},
    _updatePosition: function () {},
    _adjustPan: function () {}

}

L.U.Popup.SimplePanel = L.U.Popup.extend({

    includes: L.U.Popup.PanelMixin,

    options: {
        zoomAnimation: false
    }

});


L.U.Popup.TableMixin = {

    formatRow: function (key, value) {
        if (value.indexOf('http') === 0) {
            value = '<a href="' + value + '" target="_blank">' + value + '</a>';
        }
        return value;
    },

    addRow: function (container, key, value) {
        var tr = L.DomUtil.create('tr', '', container);
        L.DomUtil.add('th', '', tr, key);
        L.DomUtil.add('td', '', tr, this.formatRow(key, value));
    },

    renderBody: function () {
        var table = L.DomUtil.create('table');

        for (var key in this.feature.properties) {
            if (typeof this.feature.properties[key] === 'object' || key === 'name') continue;
            // TODO, manage links (url, mailto, wikipedia...)
            this.addRow(table, key, L.Util.escapeHTML(this.feature.properties[key]).trim());
        }
        return table;
    }

};

L.U.Popup.Table = L.U.Popup.BaseWithTitle.extend({
    includes: L.U.Popup.TableMixin
});

L.U.Popup.table = L.U.Popup.Table;  // backward compatibility

L.U.Popup.TablePanel = L.U.Popup.extend({
    includes: [L.U.Popup.PanelMixin, L.U.Popup.TableMixin]
});
