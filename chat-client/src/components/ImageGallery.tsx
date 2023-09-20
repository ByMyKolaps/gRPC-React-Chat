import React, { useEffect, useState } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import GridList from "@material-ui/core/GridList";
import GridListTile from "@material-ui/core/GridListTile";
import DialogTitle from "@material-ui/core/DialogTitle";
import { url } from "inspector";

type Images = { id: string; download_url: string };

interface Props {
  isOpen: boolean;
  onImageSelect: (img: string) => void;
}

const ImageGalleryDialog: React.FC<Props> = (props) => {
  const [images, setImages] = useState<Array<Images>>([]);
  const { isOpen, onImageSelect } = props;

  useEffect(() => {
    for (let i = 0; i < 9; i++)
    {
      let image = fetch('https://loremflickr.com/320/240')
        .then((resp) => {
          const img: Images = {id: i.toString(), download_url: resp.url}
          setImages(prev => [...prev, img])
        })
    }
  }, []);

  return (
    <Dialog open={isOpen} keepMounted aria-labelledby="dialog-slide-title">
      <DialogTitle id="dialog-slide-title">
        {"Select your image avatar"}
      </DialogTitle>
      <DialogContent>
        <GridList cellHeight={160} cols={3}>
          {images.map((img) => (
            <GridListTile
              style={{ cursor: "pointer" }}
              key={img.id}
              cols={1}
              onClick={() => onImageSelect(img.download_url)}
            >
              <img src={img.download_url} alt="Display" />
            </GridListTile>
          ))}
        </GridList>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGalleryDialog;